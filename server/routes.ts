import type { Express } from "express";
import type { Server } from "node:http";
import {
  agentProfileSchema,
  agentStatusUpdateSchema,
  assignmentRequestSchema,
  quoteRequestSchema,
  type AgentCase,
  type AgentProfile,
  type AgentProfileReadiness,
  type AgentCaseStatus,
  type AssignmentResponse,
  type QuoteOption,
  type QuoteRequest,
  type QuoteResponse,
} from "@shared/schema";

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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/agent/profile", (_req, res) => {
    return res.json(profileReadiness(agentProfile));
  });

  app.put("/api/agent/profile", (req, res) => {
    const parsed = agentProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid agent profile", issues: parsed.error.issues });
    }

    agentProfile = parsed.data;
    partnerAgent.name = agentProfile.name;
    partnerAgent.agency = agentProfile.agency;
    partnerAgent.licenseStates = agentProfile.licenseStates;
    partnerAgent.carrierAppointments = agentProfile.carrierAppointments;
    partnerAgent.phone = agentProfile.phone;

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

    agentCases.unshift(caseFromAssignment(response, { intake: parsed.data.intake, selectedQuote: parsed.data.selectedQuote, quoteRequest: parsed.data.quoteRequest }));

    return res.json(response);
  });

  app.get("/api/agent/cases", (_req, res) => {
    return res.json(agentCases);
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

    return res.json(target);
  });

  return httpServer;
}
