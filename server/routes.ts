import type { Express } from "express";
import type { Server } from "node:http";
import {
  adminAssignAgentSchema,
  adminCaseActionSchema,
  agentProfileSchema,
  agentStatusUpdateSchema,
  assignmentRequestSchema,
  landingPageSchema,
  landingQuoteRequestSchema,
  landingSelectionSchema,
  manualAgentInputSchema,
  quoteRequestSchema,
  type AgentCase,
  type AgentProductLine,
  type AgentProfile,
  type AgentProfileReadiness,
  type AgentCaseStatus,
  type AdminAssignmentCase,
  type AdminAssignmentDashboard,
  type AssignmentResponse,
  type LandingQuoteOption,
  type LandingQuoteResponse,
  type RoutingCandidate,
  type QuoteOption,
  type QuoteRequest,
  type QuoteResponse,
} from "@shared/schema";
import {
  createLandingPage,
  deleteLandingPage,
  getLandingPageBySlug,
  getSubmission,
  listAllLeads,
  listLandingPages,
  listLeadsForAgent,
  publicLandingPage,
  recordSubmission,
  seedLandingPages,
  selectQuote,
  updateLandingPage,
} from "./landing-pages";
import { buildMockQuotes, fetchHexureQuotes, filterQuotesByLandingPage } from "./hexure";
import { ensureDatabaseReady, hasDatabaseUrl } from "./db";
import {
  listVisitorCaptureEvents,
  recordVisitorCaptureEvent,
  type VisitorCaptureInput,
} from "./visitor-capture";
import {
  loadAgentCases,
  loadAgentDirectory,
  loadAgentProfile,
  saveAgentCase,
  saveAgentDirectory,
  saveAgentProfile,
  saveAllAgentCases,
  type AgentDirectoryEntry,
} from "./agent-state";

const carriers = [
  { id: "banner-life", name: "Banner Life", rating: "A+", term: 0.9, permanent: 1.04, conversion: "Convertible through year 20" },
  { id: "protective", name: "Protective", rating: "A+", term: 0.91, permanent: 0.99, conversion: "Flexible conversion window" },
  { id: "pacific-life", name: "Pacific Life", rating: "A+", term: 0.94, permanent: 0.96, conversion: "Permanent conversion options" },
  { id: "prudential", name: "Prudential", rating: "A+", term: 0.99, permanent: 0.98, conversion: "Product-specific conversion privileges" },
  { id: "john-hancock", name: "John Hancock", rating: "A+", term: 1.01, permanent: 0.95, conversion: "Vitality-oriented upgrade path" },
  { id: "mutual-of-omaha", name: "Mutual of Omaha", rating: "A+", term: 0.96, permanent: 1.08, conversion: "Conversion varies by product" },
  { id: "nationwide", name: "Nationwide", rating: "A", term: 0.98, permanent: 0.97, conversion: "Eligible products subject to state rules" },
  { id: "lincoln", name: "Lincoln Financial", rating: "A", term: 1.02, permanent: 0.95, conversion: "Permanent product conversion options" },
  { id: "transamerica", name: "Transamerica", rating: "A", term: 0.97, permanent: 1.02, conversion: "Convertible during allowed period" },
  { id: "massmutual", name: "MassMutual", rating: "A++", term: 1.08, permanent: 0.92, conversion: "Strong permanent planning fit" },
  { id: "guardian", name: "Guardian", rating: "A++", term: 1.07, permanent: 0.93, conversion: "Permanent conversion subject to limits" },
  { id: "north-american", name: "North American", rating: "A+", term: 0.95, permanent: 0.98, conversion: "Eligible term conversion window" },
];

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function baseRate(request: QuoteRequest) {
  const ageFactor = 1 + Math.max(0, request.age - 30) * 0.055;
  const faceFactor = request.faceAmount / 100_000;
  const termFactor = request.termLength / 20;
  const healthFactor =
    request.healthClass === "preferred-plus" ? 0.82 : request.healthClass === "preferred" ? 1 : request.healthClass === "standard-plus" ? 1.18 : 1.38;
  const genderFactor = request.gender === "female" ? 0.9 : 1;
  const tobaccoFactor = request.tobacco ? 2.15 : 1;
  return faceFactor * ageFactor * termFactor * healthFactor * genderFactor * tobaccoFactor * 18;
}

function productConfig(lineType: QuoteRequest["lineType"]) {
  const configs = {
    "term-life": { productType: "Term" as const, name: "Level Term Life", factor: 1, highlight: "Lowest-cost death benefit focus" },
    iul: { productType: "IUL" as const, name: "Indexed Universal Life", factor: 2.15, highlight: "Permanent coverage with index-linked cash value potential" },
    "mortgage-protection": { productType: "Mortgage Protection" as const, name: "Mortgage Protection Term", factor: 0.96, highlight: "Coverage designed around mortgage payoff needs" },
    "whole-life": { productType: "Whole Life" as const, name: "Whole Life", factor: 2.65, highlight: "Lifetime coverage with guaranteed cash value emphasis" },
    "universal-life": { productType: "UL" as const, name: "Universal Life", factor: 1.75, highlight: "Flexible permanent coverage path" },
    "final-expense": { productType: "Final Expense" as const, name: "Final Expense Life", factor: 0.72, highlight: "Smaller coverage for burial and final costs" },
    annuities: { productType: "Annuity" as const, name: "Fixed / Indexed Annuity", factor: 0.55, highlight: "Retirement income and accumulation comparison" },
  };
  return configs[lineType];
}

function simulateQuote(request: QuoteRequest, carrier: (typeof carriers)[number], index: number): QuoteOption {
  const config = productConfig(request.lineType);
  const carrierFactor = ["Term", "Mortgage Protection", "Final Expense"].includes(config.productType) ? carrier.term : carrier.permanent;
  const productFactor = carrierFactor * config.factor;
  const stateFactor = ["NY", "CA", "FL"].includes(request.state) ? 1.03 : 1;
  const variation = 1 + ((index % 5) - 2) * 0.012;
  const monthlyPremium = roundMoney(baseRate(request) * productFactor * stateFactor * variation);
  const annualPremium = roundMoney(monthlyPremium * 11.6);
  const fitScore = Math.max(74, Math.min(99, Math.round(100 - productFactor * 8 + (carrier.rating === "A++" ? 3 : carrier.rating === "A+" ? 2 : 0) - index * 0.35)));

  return {
    quoteId: `${carrier.id.toUpperCase().replaceAll("-", "").slice(0, 5)}-${config.productType.replaceAll(" ", "")}-${request.state}-${index + 1}`,
    carrierId: carrier.id,
    carrierName: carrier.name,
    productName: ["Term", "Mortgage Protection"].includes(config.productType) ? `${request.termLength}-Year ${config.name}` : config.name,
    productType: config.productType,
    monthlyPremium,
    annualPremium,
    amBestRating: carrier.rating,
    termLength: request.termLength,
    conversion: carrier.conversion,
    highlights: [
      config.highlight,
      `${carrier.rating} AM Best rating simulation`,
      request.tobacco ? "Tobacco pricing included" : "Non-tobacco class assumed",
    ],
    fitScore,
  };
}

function assignmentFee(annualPremium: number) {
  if (annualPremium < 1_000) return Math.max(150, Math.round(annualPremium * 0.25));
  if (annualPremium < 2_000) return Math.max(300, Math.round(annualPremium * 0.3));
  if (annualPremium < 3_500) return Math.max(625, Math.round(annualPremium * 0.35));
  if (annualPremium < 6_000) return Math.max(1_225, Math.round(annualPremium * 0.4));
  return Math.max(2_400, Math.round(annualPremium * 0.45));
}

function feeTier(annualPremium: number) {
  if (annualPremium < 1_000) return "Starter: 25% of annual premium, $150 minimum";
  if (annualPremium < 2_000) return "Core: 30% of annual premium, $300 minimum";
  if (annualPremium < 3_500) return "Growth: 35% of annual premium, $625 minimum";
  if (annualPremium < 6_000) return "Premium: 40% of annual premium, $1,225 minimum";
  return "Elite: 45% of annual premium, $2,400 minimum";
}

const partnerAgent: AssignmentResponse["assignedAgent"] = {
  name: "Maya Thompson",
  agency: "PolicyQuoters Licensed Partner Network",
  licenseStates: ["NY", "FL", "TX", "CA", "PA"],
  carrierAppointments: ["Banner Life", "Protective", "Pacific Life", "Prudential", "Guardian", "MassMutual"],
  phone: "(800) 555-0148",
};

let agentProfile: AgentProfile = {
  name: partnerAgent.name,
  agency: partnerAgent.agency,
  npn: "18273645",
  email: "maya.thompson@example.com",
  phone: partnerAgent.phone,
  licenseStates: partnerAgent.licenseStates,
  carrierAppointments: partnerAgent.carrierAppointments,
  productLines: ["term-life", "iul", "mortgage-protection"],
  weeklyCapacity: 12,
  acceptsInstantAssignments: false,
  paymentMethod: {
    brand: "Visa",
    last4: "4242",
    status: "verified",
  },
  agreementAccepted: false,
  feeAuthorizationAccepted: false,
};

type AgentDirectoryProfile = AgentDirectoryEntry;

function profileFromAgent(agent: AgentDirectoryProfile): AssignmentResponse["assignedAgent"] {
  return {
    name: agent.name,
    agency: agent.agency,
    licenseStates: agent.licenseStates,
    carrierAppointments: agent.carrierAppointments,
    phone: agent.phone,
  };
}

function productLineFromCase(agentCase: Pick<AgentCase, "lineType" | "productType">): AgentProductLine {
  const normalized = `${agentCase.lineType} ${agentCase.productType}`.toLowerCase();
  if (normalized.includes("mortgage")) return "mortgage-protection";
  if (normalized.includes("iul") || normalized.includes("indexed")) return "iul";
  if (normalized.includes("whole")) return "whole-life";
  if (normalized.includes("universal")) return "universal-life";
  if (normalized.includes("final")) return "final-expense";
  if (normalized.includes("annuity")) return "annuities";
  return "term-life";
}

let agentDirectory: AgentDirectoryProfile[] = [
  {
    id: "AGENT-MAYA",
    ...agentProfile,
    performanceScore: 96,
    declineRate: 0.06,
    activeAssignments: 3,
  },
  {
    id: "AGENT-ELLIOT",
    name: "Elliot Ramirez",
    agency: "Summit Life Partners",
    npn: "27189304",
    email: "elliot.ramirez@example.com",
    phone: "(866) 555-0136",
    licenseStates: ["FL", "GA", "NC", "TX"],
    carrierAppointments: ["Protective", "Banner Life", "Nationwide", "Lincoln Financial", "Transamerica"],
    productLines: ["term-life", "mortgage-protection", "final-expense"],
    weeklyCapacity: 18,
    acceptsInstantAssignments: true,
    paymentMethod: { brand: "Mastercard", last4: "1881", status: "verified" },
    agreementAccepted: true,
    feeAuthorizationAccepted: true,
    performanceScore: 91,
    declineRate: 0.04,
    activeAssignments: 5,
  },
  {
    id: "AGENT-PRIYA",
    name: "Priya Shah",
    agency: "Evergreen Advanced Markets",
    npn: "39024817",
    email: "priya.shah@example.com",
    phone: "(877) 555-0184",
    licenseStates: ["NY", "NJ", "PA", "CA", "IL"],
    carrierAppointments: ["Guardian", "MassMutual", "Pacific Life", "Prudential", "Nationwide"],
    productLines: ["iul", "whole-life", "universal-life", "annuities"],
    weeklyCapacity: 10,
    acceptsInstantAssignments: true,
    paymentMethod: { brand: "Amex", last4: "1005", status: "verified" },
    agreementAccepted: true,
    feeAuthorizationAccepted: true,
    performanceScore: 98,
    declineRate: 0.02,
    activeAssignments: 4,
  },
  {
    id: "AGENT-DANIEL",
    name: "Daniel Brooks",
    agency: "Lakeside Family Insurance",
    npn: "61820394",
    email: "daniel.brooks@example.com",
    phone: "(855) 555-0172",
    licenseStates: ["TX", "AZ", "OH", "MI"],
    carrierAppointments: ["Banner Life", "Protective", "North American", "Mutual of Omaha"],
    productLines: ["term-life", "final-expense", "mortgage-protection"],
    weeklyCapacity: 8,
    acceptsInstantAssignments: false,
    paymentMethod: { brand: "Visa", last4: "7729", status: "verified" },
    agreementAccepted: true,
    feeAuthorizationAccepted: false,
    performanceScore: 84,
    declineRate: 0.14,
    activeAssignments: 7,
  },
];

function profileReadiness(profile: AgentProfile): AgentProfileReadiness {
  const missing: string[] = [];
  if (!profile.licenseStates.length) missing.push("Add at least one licensed state.");
  if (!profile.carrierAppointments.length) missing.push("Add at least one carrier appointment.");
  if (!profile.productLines.length) missing.push("Select product lines you will accept.");
  if (profile.weeklyCapacity < 1) missing.push("Set weekly assignment capacity.");
  if (profile.paymentMethod.status !== "verified") missing.push("Add a verified payment method.");
  if (!profile.agreementAccepted) missing.push("Accept the partner assignment agreement.");
  if (!profile.feeAuthorizationAccepted) missing.push("Authorize assignment-fee charges.");
  if (!profile.acceptsInstantAssignments) missing.push("Turn on instant assignments.");

  const totalChecks = 8;
  const score = Math.round(((totalChecks - missing.length) / totalChecks) * 100);
  return {
    ready: missing.length === 0,
    score,
    missing,
    profile,
  };
}

function currentPrimaryAgent() {
  return agentDirectory.find((agent) => agent.id === "AGENT-MAYA");
}

function syncPrimaryAgentProfile() {
  const current = currentPrimaryAgent();
  if (!current) return;
  Object.assign(current, agentProfile);
  partnerAgent.name = agentProfile.name;
  partnerAgent.agency = agentProfile.agency;
  partnerAgent.licenseStates = agentProfile.licenseStates;
  partnerAgent.carrierAppointments = agentProfile.carrierAppointments;
  partnerAgent.phone = agentProfile.phone;
}

function candidateForCase(agent: AgentDirectoryProfile, agentCase: AgentCase): RoutingCandidate {
  const requiredProductLine = productLineFromCase(agentCase);
  const readiness = profileReadiness(agent);
  const signals = [
    {
      label: "Licensed in customer state",
      pass: agent.licenseStates.includes(agentCase.customer.state),
      detail: `${agentCase.customer.state} ${agent.licenseStates.includes(agentCase.customer.state) ? "covered" : "not covered"}`,
    },
    {
      label: "Carrier appointed",
      pass: agent.carrierAppointments.includes(agentCase.carrierName),
      detail: agent.carrierAppointments.includes(agentCase.carrierName) ? `${agentCase.carrierName} appointment active` : `No ${agentCase.carrierName} appointment`,
    },
    {
      label: "Product line accepted",
      pass: agent.productLines.includes(requiredProductLine),
      detail: requiredProductLine.replaceAll("-", " "),
    },
    {
      label: "Capacity available",
      pass: agent.activeAssignments < agent.weeklyCapacity,
      detail: `${agent.activeAssignments}/${agent.weeklyCapacity} active assignments`,
    },
    {
      label: "Payment verified",
      pass: agent.paymentMethod.status === "verified",
      detail: agent.paymentMethod.status === "verified" ? `${agent.paymentMethod.brand} ending ${agent.paymentMethod.last4}` : "No verified card",
    },
    {
      label: "Fee authorization",
      pass: agent.feeAuthorizationAccepted,
      detail: agent.feeAuthorizationAccepted ? "Accepted" : "Not accepted",
    },
    {
      label: "Instant assignments",
      pass: agent.acceptsInstantAssignments,
      detail: agent.acceptsInstantAssignments ? "Enabled" : "Off",
    },
  ];
  const blockers = signals.filter((signal) => !signal.pass).map((signal) => signal.label);
  const eligible = blockers.length === 0;
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        signals.filter((signal) => signal.pass).length * 9 +
          agent.performanceScore * 0.32 +
          Math.max(0, agent.weeklyCapacity - agent.activeAssignments) * 1.4 -
          agent.declineRate * 42 +
          readiness.score * 0.12,
      ),
    ),
  );

  return {
    agentId: agent.id,
    name: agent.name,
    agency: agent.agency,
    phone: agent.phone,
    score,
    eligible,
    activeAssignments: agent.activeAssignments,
    weeklyCapacity: agent.weeklyCapacity,
    performanceScore: agent.performanceScore,
    declineRate: agent.declineRate,
    readinessReady: readiness.ready,
    paymentVerified: agent.paymentMethod.status === "verified",
    feeAuthorized: agent.feeAuthorizationAccepted,
    explanation: eligible
      ? `${agent.name} is eligible: licensed, appointed, payment-ready, and below capacity.`
      : `${agent.name} is blocked by ${blockers.slice(0, 2).join(" and ")}${blockers.length > 2 ? " plus other checks" : ""}.`,
    blockers,
    signals,
  };
}

function adminCase(agentCase: AgentCase): AdminAssignmentCase {
  const candidates = agentDirectory.map((agent) => candidateForCase(agent, agentCase)).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
  const recommended = candidates.find((candidate) => candidate.eligible);
  const attempts = Math.max(1, agentCase.auditTrail.filter((entry) => /assigned|rerouted|expired|declined/i.test(entry.event)).length);
  return {
    ...agentCase,
    routing: {
      requiredProductLine: productLineFromCase(agentCase),
      recommendedAgentId: recommended?.agentId,
      recommendedScore: recommended?.score ?? candidates[0]?.score ?? 0,
      expiresInMinutes: agentCase.status === "assigned" ? 24 : agentCase.status === "available" || agentCase.status === "declined" ? 0 : 90,
      attempts,
      candidates,
    },
  };
}

function adminDashboard(): AdminAssignmentDashboard {
  const cases = agentCases.map(adminCase);
  return {
    cases,
    metrics: {
      waitingForAssignment: cases.filter((agentCase) => agentCase.status === "available" || agentCase.status === "declined").length,
      needsReroute: cases.filter((agentCase) => ["available", "declined"].includes(agentCase.status) || !agentCase.routing.recommendedAgentId).length,
      activeAssignments: cases.filter((agentCase) => ["assigned", "accepted", "contacted", "application-started", "submitted"].includes(agentCase.status)).length,
      potentialFees: cases.filter((agentCase) => !["declined", "not-placed"].includes(agentCase.status)).reduce((sum, agentCase) => sum + agentCase.assignmentFee, 0),
    },
  };
}

function assignCaseToAgent(agentCase: AgentCase, agentId: string, actor: string, reason?: string) {
  const agent = agentDirectory.find((item) => item.id === agentId);
  if (!agent) return undefined;
  const candidate = candidateForCase(agent, agentCase);
  agentCase.assignedAgent = profileFromAgent(agent);
  agentCase.status = "assigned";
  agentCase.chargeStatus = agent.feeAuthorizationAccepted && agent.paymentMethod.status === "verified" ? "authorized" : "pending";
  agentCase.eligibility = {
    licensedInState: agent.licenseStates.includes(agentCase.customer.state),
    appointedWithCarrier: agent.carrierAppointments.includes(agentCase.carrierName),
    capacityAvailable: agent.activeAssignments < agent.weeklyCapacity,
    priorityReason: reason || candidate.explanation,
  };
  agentCase.auditTrail.unshift({
    at: "Just now",
    actor,
    event: `Assigned to ${agent.name}. ${reason ? `Reason: ${reason}` : candidate.explanation}`,
  });
  return agentCase;
}

const seedCases: AgentCase[] = [
  {
    id: "CASE-1042",
    assignmentId: "AOR-MVP1042",
    customer: { name: "Jordan Riley", email: "jordan.riley@example.com", phone: "(212) 555-0198", state: "NY", address: "125 Hudson Street, New York, NY 10013" },
    lineType: "IUL",
    carrierName: "Guardian",
    productName: "Indexed Universal Life",
    productType: "IUL",
    faceAmount: 500_000,
    monthlyPremium: 300.3,
    annualPremium: 3483.48,
    amBestRating: "A++",
    status: "assigned",
    priorityScore: 94,
    assignmentFee: assignmentFee(3483.48),
    feeTier: feeTier(3483.48),
    chargeStatus: "authorized",
    dueBy: "Today, 11:30 AM",
    assignedAgent: partnerAgent,
    eligibility: {
      licensedInState: true,
      appointedWithCarrier: true,
      capacityAvailable: true,
      priorityReason: "High premium case, signed consent, agent has Guardian appointment in NY.",
    },
    intake: {
      quoteId: "GUARD-IUL-NY-11",
      legalName: "Jordan Riley",
      email: "jordan.riley@example.com",
      phone: "(212) 555-0198",
      address: "125 Hudson Street, New York, NY 10013",
      beneficiary: "Spouse - primary beneficiary",
      owner: "Insured owns the policy",
      annualIncome: 185_000,
      replacement: false,
      notes: "Customer asked about cash value and wants a strong A++ carrier.",
    },
    checklist: [
      { label: "Review selected quote snapshot", complete: true },
      { label: "Call customer within SLA", complete: false },
      { label: "Open carrier eApp or FireLight packet", complete: false },
      { label: "Submit application to carrier", complete: false },
    ],
    auditTrail: [
      { at: "8:12 AM", actor: "PolicyQuoters", event: "Customer signed consumer packet." },
      { at: "8:13 AM", actor: "Assignment Engine", event: "Matched to Maya Thompson based on NY license and Guardian appointment." },
    ],
  },
  {
    id: "CASE-1041",
    assignmentId: "AOR-MVP1041",
    customer: { name: "Alicia Morgan", email: "alicia.morgan@example.com", phone: "(813) 555-0108", state: "FL", address: "84 Bayshore Drive, Tampa, FL 33606" },
    lineType: "Mortgage Protection",
    carrierName: "Protective",
    productName: "25-Year Mortgage Protection Term",
    productType: "Mortgage Protection",
    faceAmount: 425_000,
    monthlyPremium: 68.42,
    annualPremium: 793.67,
    amBestRating: "A+",
    status: "accepted",
    priorityScore: 88,
    assignmentFee: assignmentFee(793.67),
    feeTier: feeTier(793.67),
    chargeStatus: "pending",
    dueBy: "Today, 1:00 PM",
    assignedAgent: partnerAgent,
    eligibility: {
      licensedInState: true,
      appointedWithCarrier: true,
      capacityAvailable: true,
      priorityReason: "Mortgage protection request with signed packet and Protective appointment available.",
    },
    intake: {
      quoteId: "PROTE-MortgageProtection-FL-2",
      legalName: "Alicia Morgan",
      email: "alicia.morgan@example.com",
      phone: "(813) 555-0108",
      address: "84 Bayshore Drive, Tampa, FL 33606",
      beneficiary: "Spouse",
      owner: "Insured owns the policy",
      annualIncome: 142_000,
      replacement: false,
      notes: "Customer wants coverage aligned to remaining mortgage term.",
    },
    checklist: [
      { label: "Review selected quote snapshot", complete: true },
      { label: "Call customer within SLA", complete: true },
      { label: "Open carrier eApp or FireLight packet", complete: false },
      { label: "Submit application to carrier", complete: false },
    ],
    auditTrail: [
      { at: "7:48 AM", actor: "PolicyQuoters", event: "Customer signed consumer packet." },
      { at: "7:52 AM", actor: "Maya Thompson", event: "Accepted assignment." },
    ],
  },
  {
    id: "CASE-1040",
    assignmentId: "AOR-MVP1040",
    customer: { name: "Marcus Chen", email: "marcus.chen@example.com", phone: "(512) 555-0161", state: "TX", address: "201 Congress Avenue, Austin, TX 78701" },
    lineType: "Term Life",
    carrierName: "Banner Life",
    productName: "20-Year Level Term Life",
    productType: "Term",
    faceAmount: 1_000_000,
    monthlyPremium: 73.86,
    annualPremium: 856.78,
    amBestRating: "A+",
    status: "contacted",
    priorityScore: 82,
    assignmentFee: assignmentFee(856.78),
    feeTier: feeTier(856.78),
    chargeStatus: "pending",
    dueBy: "Tomorrow, 9:00 AM",
    assignedAgent: partnerAgent,
    eligibility: {
      licensedInState: true,
      appointedWithCarrier: true,
      capacityAvailable: true,
      priorityReason: "Large face amount, Banner appointment active, customer ready for eApp handoff.",
    },
    intake: {
      quoteId: "BANNE-Term-TX-1",
      legalName: "Marcus Chen",
      email: "marcus.chen@example.com",
      phone: "(512) 555-0161",
      address: "201 Congress Avenue, Austin, TX 78701",
      beneficiary: "Spouse primary, children contingent",
      owner: "Insured owns the policy",
      annualIncome: 260_000,
      replacement: false,
      notes: "Customer prefers low-cost term and fast underwriting.",
    },
    checklist: [
      { label: "Review selected quote snapshot", complete: true },
      { label: "Call customer within SLA", complete: true },
      { label: "Open carrier eApp or FireLight packet", complete: true },
      { label: "Submit application to carrier", complete: false },
    ],
    auditTrail: [
      { at: "Yesterday", actor: "PolicyQuoters", event: "Customer signed consumer packet." },
      { at: "Yesterday", actor: "Maya Thompson", event: "Marked customer contacted." },
    ],
  },
];

const agentCases: AgentCase[] = [...seedCases];

function statusEvent(status: AgentCaseStatus) {
  const labels: Record<AgentCaseStatus, string> = {
    available: "Returned to available queue.",
    assigned: "Assignment reset to assigned.",
    accepted: "Accepted assignment.",
    contacted: "Marked customer contacted.",
    "application-started": "Started carrier application handoff.",
    submitted: "Submitted application to carrier.",
    issued: "Marked policy issued.",
    declined: "Declined assignment.",
    "not-placed": "Marked policy not placed.",
  };
  return labels[status];
}

function checklistForStatus(status: AgentCaseStatus, checklist: AgentCase["checklist"]) {
  return checklist.map((item, index) => ({
    ...item,
    complete:
      item.complete ||
      (status === "accepted" && index <= 0) ||
      (status === "contacted" && index <= 1) ||
      (status === "application-started" && index <= 2) ||
      (["submitted", "issued"].includes(status) && index <= 3),
  }));
}

function lineLabel(lineType?: QuoteRequest["lineType"], productType?: QuoteOption["productType"]) {
  const labels: Partial<Record<QuoteRequest["lineType"], string>> = {
    "term-life": "Life Insurance",
    iul: "IUL",
    "mortgage-protection": "Mortgage Protection",
    "whole-life": "Whole Life",
    "universal-life": "Universal Life",
    "final-expense": "Final Expense",
    annuities: "Annuities",
  };
  return lineType ? labels[lineType] ?? productType ?? "Life Insurance" : productType ?? "Life Insurance";
}

function caseFromAssignment(assignment: AssignmentResponse, request: { intake: AgentCase["intake"]; selectedQuote?: QuoteOption; quoteRequest?: QuoteRequest }): AgentCase {
  const selectedQuote = request.selectedQuote;
  const annualPremium = selectedQuote?.annualPremium ?? 1650;
  const state = request.quoteRequest?.state ?? request.intake.quoteId.split("-").at(-2) ?? request.intake.address.match(/\b[A-Z]{2}\b/)?.[0] ?? "NY";
  return {
    id: `CASE-${Math.floor(1043 + agentCases.length)}`,
    assignmentId: assignment.assignmentId,
    customer: {
      name: request.intake.legalName,
      email: request.intake.email,
      phone: request.intake.phone,
      state,
      address: request.intake.address,
    },
    lineType: lineLabel(request.quoteRequest?.lineType, selectedQuote?.productType),
    carrierName: selectedQuote?.carrierName ?? "Selected carrier",
    productName: selectedQuote?.productName ?? "Selected product",
    productType: selectedQuote?.productType ?? "Term",
    faceAmount: request.quoteRequest?.faceAmount ?? 500_000,
    monthlyPremium: selectedQuote?.monthlyPremium ?? 142.25,
    annualPremium,
    amBestRating: selectedQuote?.amBestRating ?? "A+",
    status: "assigned",
    priorityScore: selectedQuote ? Math.min(99, selectedQuote.fitScore + 4) : 86,
    assignmentFee: assignment.assignmentFee,
    feeTier: feeTier(annualPremium),
    chargeStatus: "authorized",
    dueBy: "Today, 2:00 PM",
    assignedAgent: assignment.assignedAgent,
    eligibility: {
      licensedInState: true,
      appointedWithCarrier: true,
      capacityAvailable: true,
      priorityReason: "Customer selected a quote, completed intake, accepted disclosures, and signed the packet.",
    },
    intake: request.intake,
    checklist: [
      { label: "Review selected quote snapshot", complete: true },
      { label: "Call customer within SLA", complete: false },
      { label: "Open carrier eApp or FireLight packet", complete: false },
      { label: "Submit application to carrier", complete: false },
    ],
    auditTrail: [
      { at: "Just now", actor: "PolicyQuoters", event: "Customer signed consumer packet." },
      { at: "Just now", actor: "Assignment Engine", event: `Assigned to ${assignment.assignedAgent.name}.` },
    ],
  };
}

function persistAgentDirectory() {
  saveAgentDirectory(agentDirectory).catch((error) => {
    console.error("[persistence] Failed to save agent directory:", (error as Error).message);
  });
}

function persistAgentProfile() {
  saveAgentProfile(agentProfile).catch((error) => {
    console.error("[persistence] Failed to save agent profile:", (error as Error).message);
  });
}

function persistAgentCase(agentCase: AgentCase) {
  saveAgentCase(agentCase).catch((error) => {
    console.error("[persistence] Failed to save agent case:", (error as Error).message);
  });
}

async function hydrateAgentState() {
  if (!hasDatabaseUrl()) {
    console.warn(
      "[persistence] DATABASE_URL is not set. Using in-memory prototype storage. Set DATABASE_URL to a Supabase Postgres connection string for production persistence (see README_RENDER.md).",
    );
    return;
  }
  const ready = await ensureDatabaseReady();
  if (!ready) {
    console.error("[persistence] DATABASE_URL is set but Postgres initialization failed. Falling back to in-memory storage.");
    return;
  }
  console.log("[persistence] Postgres-backed persistence enabled (Supabase-compatible).");

  const storedDirectory = await loadAgentDirectory();
  if (storedDirectory && storedDirectory.length > 0) {
    agentDirectory = storedDirectory;
  } else {
    await saveAgentDirectory(agentDirectory);
  }

  const storedProfile = await loadAgentProfile();
  if (storedProfile) {
    agentProfile = storedProfile;
    syncPrimaryAgentProfile();
  } else {
    await saveAgentProfile(agentProfile);
  }

  const storedCases = await loadAgentCases();
  if (storedCases && storedCases.length > 0) {
    agentCases.splice(0, agentCases.length, ...storedCases);
  } else {
    await saveAllAgentCases(agentCases);
  }
}

const GE_ACCOUNT_KEY = "R18HJ289";

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) return trimmed;
    } else if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function getNested(obj: unknown, ...keys: string[]): unknown {
  let cursor: unknown = obj;
  for (const key of keys) {
    if (cursor && typeof cursor === "object" && key in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cursor;
}

// Extract a best-effort client IP from common proxy headers (Render sits behind
// a proxy, so req.ip is the proxy). We never trust this for auth, only logging.
function extractClientIp(headers: Record<string, unknown>, fallback?: string): string | undefined {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.length > 0) return realIp.trim();
  return fallback || undefined;
}

function buildVisitorCaptureInput(
  body: unknown,
  headers: Record<string, unknown>,
  fallbackIp?: string,
): VisitorCaptureInput {
  const payload = (body && typeof body === "object" ? (body as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;

  const email = pickString(
    payload.email,
    payload.email_address,
    getNested(payload, "contact", "email"),
    getNested(payload, "person", "email"),
  );
  const firstName = pickString(
    payload.first_name,
    payload.firstName,
    getNested(payload, "contact", "first_name"),
    getNested(payload, "person", "first_name"),
  );
  const lastName = pickString(
    payload.last_name,
    payload.lastName,
    getNested(payload, "contact", "last_name"),
    getNested(payload, "person", "last_name"),
  );
  const phone = pickString(
    payload.phone,
    payload.phone_number,
    payload.phoneNumber,
    getNested(payload, "contact", "phone"),
  );
  const pageUrl = pickString(payload.page_url, payload.pageUrl, payload.url, payload.page);
  const referrer = pickString(payload.referrer, payload.referer);

  return {
    source: pickString(payload.source, headers["x-policyquoters-webhook-source"]) ?? "getemails",
    accountKey: pickString(payload.account_key, payload.accountKey) ?? GE_ACCOUNT_KEY,
    email,
    firstName,
    lastName,
    phone,
    pageUrl,
    referrer,
    ipAddress: extractClientIp(headers, fallbackIp),
    userAgent: pickString(headers["user-agent"]),
    utmSource: pickString(payload.utm_source, payload.utmSource, getNested(payload, "utm", "source")),
    utmMedium: pickString(payload.utm_medium, payload.utmMedium, getNested(payload, "utm", "medium")),
    utmCampaign: pickString(payload.utm_campaign, payload.utmCampaign, getNested(payload, "utm", "campaign")),
    rawPayload: body ?? null,
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await hydrateAgentState();

  await seedLandingPages(
    agentDirectory.map((agent) => ({
      id: agent.id,
      name: agent.name,
      phone: agent.phone,
      email: agent.email,
      agency: agent.agency,
      licenseStates: agent.licenseStates,
      carrierAppointments: agent.carrierAppointments,
    })),
  );

  app.get("/healthz", (_req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  // Webhook receiver for the GetEmails (GE) visitor capture tool. Authenticated
  // via the X-PolicyQuoters-Webhook-Secret header compared to the
  // GETEMAILS_WEBHOOK_SECRET env var. Accepts arbitrary JSON; stores the raw
  // payload plus best-effort extracted contact fields.
  app.post("/api/webhooks/visitor-capture", async (req, res, next) => {
    const expectedSecret = process.env.GETEMAILS_WEBHOOK_SECRET?.trim();
    const providedSecret = req.header("x-policyquoters-webhook-secret");
    const isProduction = process.env.NODE_ENV === "production";

    if (expectedSecret && expectedSecret.length > 0) {
      if (providedSecret !== expectedSecret) {
        // Never log the secret (expected or provided).
        return res.status(401).json({ ok: false, message: "Invalid or missing webhook secret." });
      }
    } else if (isProduction) {
      // Fail closed in production so we never run an open ingestion endpoint.
      console.error(
        "[visitor-capture] GETEMAILS_WEBHOOK_SECRET is not set in production. Rejecting webhook to avoid open ingestion.",
      );
      return res.status(503).json({
        ok: false,
        message: "Webhook receiver is not configured.",
      });
    } else {
      console.warn(
        "[visitor-capture] GETEMAILS_WEBHOOK_SECRET is not set. Accepting webhook without authentication (non-production only).",
      );
    }

    try {
      const input = buildVisitorCaptureInput(req.body, req.headers as Record<string, unknown>, req.ip);
      const event = await recordVisitorCaptureEvent(input);
      return res.status(202).json({ ok: true, id: event.id });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/visitor-capture-events", async (req, res, next) => {
    try {
      const limitParam = Number.parseInt(String(req.query.limit ?? "100"), 10);
      const limit = Number.isFinite(limitParam) ? limitParam : 100;
      const events = await listVisitorCaptureEvents(limit);
      return res.json(events);
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/agents", (_req, res) => {
    return res.json(
      agentDirectory.map((agent) => ({
        id: agent.id,
        name: agent.name,
        agency: agent.agency,
        email: agent.email,
        phone: agent.phone,
        licenseStates: agent.licenseStates,
        carrierAppointments: agent.carrierAppointments,
      })),
    );
  });

  app.post("/api/admin/agents", async (req, res) => {
    const parsed = manualAgentInputSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid agent", issues: parsed.error.issues });
    }
    const input = parsed.data;
    const normalizedEmail = input.email.trim().toLowerCase();
    const duplicate = agentDirectory.find((agent) => agent.email.trim().toLowerCase() === normalizedEmail);
    if (duplicate) {
      return res.status(409).json({
        message: `An agent with email "${input.email}" already exists.`,
        agentId: duplicate.id,
      });
    }

    const slugSource = input.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 20) || "AGENT";
    let candidateId = `AGENT-${slugSource}`;
    let suffix = 1;
    while (agentDirectory.some((agent) => agent.id === candidateId)) {
      suffix += 1;
      candidateId = `AGENT-${slugSource}-${suffix}`;
    }

    const newAgent: AgentDirectoryProfile = {
      id: candidateId,
      name: input.name.trim(),
      agency: input.agency.trim(),
      npn: "PENDING",
      email: input.email.trim(),
      phone: input.phone.trim(),
      licenseStates: Array.from(new Set(input.licenseStates.map((state) => state.toUpperCase()))),
      carrierAppointments: Array.from(new Set(input.carrierAppointments.map((carrier) => carrier.trim()))).filter((carrier) => carrier.length > 0),
      productLines: ["term-life"],
      weeklyCapacity: 10,
      acceptsInstantAssignments: false,
      paymentMethod: { brand: "Pending", last4: "0000", status: "not-added" },
      agreementAccepted: false,
      feeAuthorizationAccepted: false,
      performanceScore: 80,
      declineRate: 0,
      activeAssignments: 0,
    };

    agentDirectory.push(newAgent);
    try {
      await saveAgentDirectory([newAgent]);
    } catch (error) {
      console.error("[persistence] Failed to save new manual agent:", (error as Error).message);
      // Continue with in-memory entry even if DB save failed.
    }

    return res.status(201).json({
      id: newAgent.id,
      name: newAgent.name,
      agency: newAgent.agency,
      email: newAgent.email,
      phone: newAgent.phone,
      licenseStates: newAgent.licenseStates,
      carrierAppointments: newAgent.carrierAppointments,
      displayTitle: input.displayTitle?.trim() || undefined,
    });
  });

  app.get("/api/admin/landing-pages", async (_req, res, next) => {
    try {
      return res.json(await listLandingPages());
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/admin/landing-pages", async (req, res, next) => {
    const parsed = landingPageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid landing page", issues: parsed.error.issues });
    }
    try {
      const created = await createLandingPage(parsed.data);
      return res.status(201).json(created);
    } catch (error) {
      if ((error as Error).message?.includes("already exists")) {
        return res.status(409).json({ message: (error as Error).message });
      }
      return next(error);
    }
  });

  app.put("/api/admin/landing-pages/:id", async (req, res, next) => {
    const parsed = landingPageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid landing page", issues: parsed.error.issues });
    }
    try {
      const updated = await updateLandingPage(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Landing page not found" });
      return res.json(updated);
    } catch (error) {
      if ((error as Error).message?.includes("already exists")) {
        return res.status(409).json({ message: (error as Error).message });
      }
      return next(error);
    }
  });

  app.delete("/api/admin/landing-pages/:id", async (req, res, next) => {
    try {
      const deleted = await deleteLandingPage(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Landing page not found" });
      return res.status(204).end();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/landing-pages/:slug", async (req, res, next) => {
    try {
      const page = await getLandingPageBySlug(req.params.slug);
      if (!page || !page.active) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      return res.json(publicLandingPage(page));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landing-quotes", async (req, res, next) => {
    const parsed = landingQuoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid quote request", issues: parsed.error.issues });
    }
    try {
      const { slug, answers, contact } = parsed.data;
      const page = await getLandingPageBySlug(slug);
      if (!page || !page.active) {
        return res.status(404).json({ message: "Landing page not found" });
      }
      if (!page.licensedStates.map((state) => state.toUpperCase()).includes(answers.state.toUpperCase())) {
        return res.status(422).json({
          message: `The agent on this page is not licensed in ${answers.state}.`,
          allowedStates: page.licensedStates,
        });
      }

      const hexure = await fetchHexureQuotes(page, answers);
      const source: "hexure" | "mock" = hexure && hexure.length > 0 ? "hexure" : "mock";
      const raw: LandingQuoteOption[] = source === "hexure" ? hexure! : buildMockQuotes(page, answers);
      const filtered = filterQuotesByLandingPage(raw, page)
        .sort((a, b) => a.monthlyPremium - b.monthlyPremium)
        .slice(0, 9);

      const submission = await recordSubmission({
        landingPageId: page.id,
        contact,
        answers,
        options: filtered,
        source,
      });

      const response: LandingQuoteResponse = {
        requestId: `LPQ-${Date.now().toString(36).toUpperCase()}`,
        submissionId: submission.id,
        source,
        options: filtered,
        landingPage: publicLandingPage(page),
      };
      return res.json(response);
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/landing-quotes/select", async (req, res, next) => {
    const parsed = landingSelectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid selection", issues: parsed.error.issues });
    }
    try {
      const submission = await getSubmission(parsed.data.submissionId);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
      const lead = await selectQuote(parsed.data.submissionId, parsed.data.selectedQuoteId);
      if (!lead) {
        return res.status(404).json({ message: "Selected quote not found" });
      }
      return res.status(201).json({
        leadId: lead.id,
        agentDisplayName: lead.agentDisplayName,
        landingPageName: lead.landingPageName,
        selectedQuote: lead.selectedQuote,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/admin/leads", async (_req, res, next) => {
    try {
      return res.json(await listAllLeads());
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/agent/leads", async (req, res, next) => {
    try {
      const agentId = typeof req.query.agentId === "string" ? req.query.agentId : undefined;
      return res.json(await listLeadsForAgent(agentId));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/api/agent/profile", (_req, res) => {
    return res.json(profileReadiness(agentProfile));
  });

  app.put("/api/agent/profile", (req, res) => {
    const parsed = agentProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid agent profile", issues: parsed.error.issues });
    }

    agentProfile = parsed.data;
    syncPrimaryAgentProfile();
    persistAgentProfile();
    persistAgentDirectory();

    return res.json(profileReadiness(agentProfile));
  });

  app.post("/api/quotes", (req, res) => {
    const parsed = quoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid quote request", issues: parsed.error.issues });
    }

    const options = carriers
      .map((carrier, index) => simulateQuote(parsed.data, carrier, index))
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium)
      .slice(0, 12);

    const response: QuoteResponse = {
      requestId: `PQ-${Date.now().toString(36).toUpperCase()}`,
      options,
      summary: {
        lowestMonthlyPremium: options[0]?.monthlyPremium ?? 0,
        returnedQuotes: options.length,
        recommendedCarrier: options[0]?.carrierName ?? "No match",
      },
    };

    return res.json(response);
  });

  app.post("/api/assignments", (req, res) => {
    const parsed = assignmentRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid assignment request", issues: parsed.error.issues });
    }

    const estimatedAnnualPremium = parsed.data.selectedQuote?.annualPremium ?? 1_650;
    const response: AssignmentResponse = {
      assignmentId: `AOR-${Date.now().toString(36).toUpperCase()}`,
      assignedAgent: partnerAgent,
      assignmentFee: assignmentFee(estimatedAnnualPremium),
      status: "assigned",
      nextSteps: [
        "Agent receives selected quote and signed consent packet.",
        "Application handoff is prepared for FireLight or carrier eApp.",
        "Customer receives application-start confirmation and status tracker.",
      ],
    };

    const newCase = caseFromAssignment(response, { intake: parsed.data.intake, selectedQuote: parsed.data.selectedQuote, quoteRequest: parsed.data.quoteRequest });
    agentCases.unshift(newCase);
    persistAgentCase(newCase);

    return res.json(response);
  });

  app.get("/api/agent/cases", (_req, res) => {
    return res.json(agentCases);
  });

  app.get("/api/admin/assignments", (_req, res) => {
    return res.json(adminDashboard());
  });

  app.post("/api/admin/cases/:id/assign", (req, res) => {
    const parsed = adminAssignAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid assignment action", issues: parsed.error.issues });
    }

    const target = agentCases.find((agentCase) => agentCase.id === req.params.id);
    if (!target) return res.status(404).json({ message: "Case not found" });

    const updated = assignCaseToAgent(target, parsed.data.agentId, "Admin", parsed.data.reason);
    if (!updated) return res.status(404).json({ message: "Agent not found" });

    persistAgentCase(updated);
    return res.json(adminCase(updated));
  });

  app.post("/api/admin/cases/:id/reroute", (req, res) => {
    const parsed = adminCaseActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid reroute action", issues: parsed.error.issues });
    }

    const target = agentCases.find((agentCase) => agentCase.id === req.params.id);
    if (!target) return res.status(404).json({ message: "Case not found" });

    const candidates = adminCase(target).routing.candidates;
    const currentAgentName = target.assignedAgent.name;
    const next = candidates.find((candidate) => candidate.eligible && candidate.name !== currentAgentName) ?? candidates.find((candidate) => candidate.eligible);

    if (!next) {
      target.status = "available";
      target.chargeStatus = "pending";
      target.auditTrail.unshift({
        at: "Just now",
        actor: "Assignment Engine",
        event: `No eligible agent found. Case moved to admin queue. ${parsed.data.reason ? `Reason: ${parsed.data.reason}` : ""}`,
      });
      persistAgentCase(target);
      return res.json(adminCase(target));
    }

    assignCaseToAgent(target, next.agentId, "Assignment Engine", parsed.data.reason || `Rerouted to best eligible agent with score ${next.score}.`);
    target.auditTrail.unshift({
      at: "Just now",
      actor: "Assignment Engine",
      event: `Reroute completed to ${next.name}.`,
    });
    persistAgentCase(target);
    return res.json(adminCase(target));
  });

  app.post("/api/admin/cases/:id/expire", (req, res) => {
    const parsed = adminCaseActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid expire action", issues: parsed.error.issues });
    }

    const target = agentCases.find((agentCase) => agentCase.id === req.params.id);
    if (!target) return res.status(404).json({ message: "Case not found" });

    target.status = "available";
    target.chargeStatus = "pending";
    target.auditTrail.unshift({
      at: "Just now",
      actor: "Assignment Engine",
      event: `Assignment window expired and case returned to routing queue. ${parsed.data.reason ? `Reason: ${parsed.data.reason}` : ""}`,
    });
    persistAgentCase(target);
    return res.json(adminCase(target));
  });

  app.patch("/api/agent/cases/:id/status", (req, res) => {
    const parsed = agentStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid status update", issues: parsed.error.issues });
    }

    const target = agentCases.find((agentCase) => agentCase.id === req.params.id);
    if (!target) {
      return res.status(404).json({ message: "Case not found" });
    }

    target.status = parsed.data.status;
    target.checklist = checklistForStatus(parsed.data.status, target.checklist);
    target.auditTrail.unshift({
      at: "Just now",
      actor: parsed.data.status === "declined" ? "Agent" : target.assignedAgent.name,
      event: parsed.data.reason ? `${statusEvent(parsed.data.status)} Reason: ${parsed.data.reason}` : statusEvent(parsed.data.status),
    });

    if (parsed.data.status === "issued") target.chargeStatus = "charged";
    if (parsed.data.status === "declined" || parsed.data.status === "not-placed") target.chargeStatus = "waived";

    persistAgentCase(target);
    return res.json(target);
  });

  return httpServer;
}
