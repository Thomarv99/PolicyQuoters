import { z } from "zod";

export const quoteRequestSchema = z.object({
  lineType: z.enum(["term-life", "iul", "mortgage-protection", "whole-life", "universal-life", "final-expense", "annuities"]),
  faceAmount: z.number().min(10_000).max(5_000_000),
  age: z.number().min(18).max(80),
  gender: z.enum(["female", "male"]),
  state: z.string().min(2).max(2),
  healthClass: z.enum(["preferred-plus", "preferred", "standard-plus", "standard"]),
  tobacco: z.boolean(),
  termLength: z.number().min(10).max(40),
});

export const applicationIntakeSchema = z.object({
  quoteId: z.string(),
  legalName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(5),
  beneficiary: z.string().min(2),
  owner: z.string().min(2),
  annualIncome: z.number().min(0),
  replacement: z.boolean(),
  notes: z.string().optional(),
});

export const assignmentRequestSchema = z.object({
  quoteId: z.string(),
  intake: applicationIntakeSchema,
  selectedQuote: z.custom<QuoteOption>().optional(),
  quoteRequest: quoteRequestSchema.optional(),
  signatureName: z.string().min(2),
  consentTimestamp: z.string(),
});

export const agentCaseStatusSchema = z.enum([
  "available",
  "assigned",
  "accepted",
  "contacted",
  "application-started",
  "submitted",
  "issued",
  "declined",
  "not-placed",
]);

export const agentStatusUpdateSchema = z.object({
  status: agentCaseStatusSchema,
  reason: z.string().optional(),
});

export const agentProductLineSchema = z.enum(["term-life", "iul", "mortgage-protection", "whole-life", "universal-life", "final-expense", "annuities"]);

export const agentProfileSchema = z.object({
  name: z.string().min(2),
  agency: z.string().min(2),
  npn: z.string().min(4),
  email: z.string().email(),
  phone: z.string().min(10),
  licenseStates: z.array(z.string().min(2).max(2)).min(1),
  carrierAppointments: z.array(z.string().min(2)).min(1),
  productLines: z.array(agentProductLineSchema).min(1),
  weeklyCapacity: z.number().min(1).max(100),
  acceptsInstantAssignments: z.boolean(),
  paymentMethod: z.object({
    brand: z.string().min(2),
    last4: z.string().min(4).max(4),
    status: z.enum(["not-added", "verified"]),
  }),
  agreementAccepted: z.boolean(),
  feeAuthorizationAccepted: z.boolean(),
});

export const adminAssignAgentSchema = z.object({
  agentId: z.string().min(2),
  reason: z.string().optional(),
});

export const adminCaseActionSchema = z.object({
  reason: z.string().optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ApplicationIntake = z.infer<typeof applicationIntakeSchema>;
export type AssignmentRequest = z.infer<typeof assignmentRequestSchema>;
export type AgentCaseStatus = z.infer<typeof agentCaseStatusSchema>;
export type AgentStatusUpdate = z.infer<typeof agentStatusUpdateSchema>;
export type AgentProductLine = z.infer<typeof agentProductLineSchema>;
export type AgentProfile = z.infer<typeof agentProfileSchema>;
export type AdminAssignAgent = z.infer<typeof adminAssignAgentSchema>;
export type AdminCaseAction = z.infer<typeof adminCaseActionSchema>;

export type AgentProfileReadiness = {
  ready: boolean;
  score: number;
  missing: string[];
  profile: AgentProfile;
};

export type QuoteOption = {
  quoteId: string;
  carrierId: string;
  carrierName: string;
  productName: string;
  productType: "Term" | "GUL" | "IUL" | "Whole Life" | "UL" | "Final Expense" | "Mortgage Protection" | "Annuity";
  monthlyPremium: number;
  annualPremium: number;
  amBestRating: string;
  termLength: number;
  conversion: string;
  highlights: string[];
  fitScore: number;
};

export type QuoteResponse = {
  requestId: string;
  options: QuoteOption[];
  summary: {
    lowestMonthlyPremium: number;
    returnedQuotes: number;
    recommendedCarrier: string;
  };
};

export type AssignmentResponse = {
  assignmentId: string;
  assignedAgent: {
    name: string;
    agency: string;
    licenseStates: string[];
    carrierAppointments: string[];
    phone: string;
  };
  assignmentFee: number;
  status: "assigned";
  nextSteps: string[];
};

export type AgentCase = {
  id: string;
  assignmentId: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    state: string;
    address: string;
  };
  lineType: string;
  carrierName: string;
  productName: string;
  productType: QuoteOption["productType"];
  faceAmount: number;
  monthlyPremium: number;
  annualPremium: number;
  amBestRating: string;
  status: AgentCaseStatus;
  priorityScore: number;
  assignmentFee: number;
  feeTier: string;
  chargeStatus: "pending" | "authorized" | "charged" | "waived";
  dueBy: string;
  assignedAgent: AssignmentResponse["assignedAgent"];
  eligibility: {
    licensedInState: boolean;
    appointedWithCarrier: boolean;
    capacityAvailable: boolean;
    priorityReason: string;
  };
  intake: ApplicationIntake;
  checklist: Array<{
    label: string;
    complete: boolean;
  }>;
  auditTrail: Array<{
    at: string;
    actor: string;
    event: string;
  }>;
};

export type MatchSignal = {
  label: string;
  pass: boolean;
  detail: string;
};

export type RoutingCandidate = {
  agentId: string;
  name: string;
  agency: string;
  phone: string;
  score: number;
  eligible: boolean;
  activeAssignments: number;
  weeklyCapacity: number;
  performanceScore: number;
  declineRate: number;
  readinessReady: boolean;
  paymentVerified: boolean;
  feeAuthorized: boolean;
  explanation: string;
  blockers: string[];
  signals: MatchSignal[];
};

export type AdminAssignmentCase = AgentCase & {
  routing: {
    requiredProductLine: AgentProductLine;
    recommendedAgentId?: string;
    recommendedScore: number;
    expiresInMinutes: number;
    attempts: number;
    candidates: RoutingCandidate[];
  };
};

export type AdminAssignmentDashboard = {
  cases: AdminAssignmentCase[];
  metrics: {
    waitingForAssignment: number;
    needsReroute: number;
    activeAssignments: number;
    potentialFees: number;
  };
};

export const landingPageHealthOptions = ["excellent", "great", "good", "fair", "poor"] as const;
export const landingPageHealthSchema = z.enum(landingPageHealthOptions);

export const landingPageSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/i, "Slug must use letters, numbers, or dashes only"),
  agentId: z.string().min(2),
  agentDisplayName: z.string().min(2),
  agentDisplayTitle: z.string().optional(),
  agentPhone: z.string().optional(),
  agentEmail: z.string().email().optional().or(z.literal("")),
  licensedStates: z.array(z.string().min(2).max(2)).min(1),
  licensedCarriers: z.array(z.string().min(2)).min(1),
  headline: z.string().optional(),
  subheadline: z.string().optional(),
  active: z.boolean(),
  metaPixelId: z
    .string()
    .regex(/^\d{6,20}$/, "Meta Pixel ID must be 6-20 digits")
    .optional()
    .or(z.literal("")),
});

export type LandingPageInput = z.infer<typeof landingPageSchema>;

export type LandingPage = LandingPageInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type LandingPagePublic = {
  id: string;
  slug: string;
  name: string;
  headline?: string;
  subheadline?: string;
  active: boolean;
  agent: {
    displayName: string;
    title?: string;
  };
  licensedStates: string[];
  licensedCarriers: string[];
  metaPixelId?: string;
};

export const landingQuoteAnswersSchema = z.object({
  ageRange: z.string().min(1).optional(),
  age: z.number().min(18).max(85),
  gender: z.enum(["female", "male"]),
  state: z.string().min(2).max(2),
  coverageAmount: z.number().min(25_000).max(2_000_000),
  smoker: z.boolean(),
  health: landingPageHealthSchema,
});

export const landingContactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  zip: z.string().min(5).max(10).optional(),
  consent: z.literal(true),
});

export const landingQuoteRequestSchema = z.object({
  slug: z.string().min(2),
  answers: landingQuoteAnswersSchema,
  contact: landingContactSchema,
});

export type LandingQuoteAnswers = z.infer<typeof landingQuoteAnswersSchema>;
export type LandingContact = z.infer<typeof landingContactSchema>;
export type LandingQuoteRequest = z.infer<typeof landingQuoteRequestSchema>;

export type LandingQuoteOption = {
  quoteId: string;
  carrierName: string;
  productName: string;
  productType: string;
  coverageAmount: number;
  termLength: number;
  monthlyPremium: number;
  annualPremium: number;
  amBestRating?: string;
  source: "hexure" | "mock";
  highlights: string[];
};

export type LandingQuoteResponse = {
  requestId: string;
  submissionId: string;
  source: "hexure" | "mock";
  options: LandingQuoteOption[];
  landingPage: LandingPagePublic;
};

export const landingSelectionSchema = z.object({
  submissionId: z.string().min(2),
  selectedQuoteId: z.string().min(2),
});

export type LandingSelectionRequest = z.infer<typeof landingSelectionSchema>;

export type LandingLead = {
  id: string;
  submissionId: string;
  landingPageId: string;
  landingPageSlug: string;
  landingPageName: string;
  agentId: string;
  agentDisplayName: string;
  contact: LandingContact;
  answers: LandingQuoteAnswers;
  options: LandingQuoteOption[];
  selectedQuote?: LandingQuoteOption;
  status: "new" | "selected" | "contacted" | "closed";
  source: "hexure" | "mock";
  createdAt: string;
  updatedAt: string;
};
