import { z } from "zod";

export const quoteRequestSchema = z.object({
  faceAmount: z.number().min(100_000).max(5_000_000),
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
  signatureName: z.string().min(2),
  consentTimestamp: z.string(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
export type ApplicationIntake = z.infer<typeof applicationIntakeSchema>;
export type AssignmentRequest = z.infer<typeof assignmentRequestSchema>;

export type QuoteOption = {
  quoteId: string;
  carrierId: string;
  carrierName: string;
  productName: string;
  productType: "Term" | "GUL";
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
