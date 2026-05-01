import type { Express } from "express";
import type { Server } from "node:http";
import {
  assignmentRequestSchema,
  quoteRequestSchema,
  type AssignmentResponse,
  type QuoteOption,
  type QuoteRequest,
  type QuoteResponse,
} from "@shared/schema";

const carriers = [
  { id: "banner-life", name: "Banner Life", rating: "A+", term: 0.9, gul: 1.04, conversion: "Convertible through year 20" },
  { id: "protective", name: "Protective", rating: "A+", term: 0.91, gul: 0.99, conversion: "Flexible conversion window" },
  { id: "pacific-life", name: "Pacific Life", rating: "A+", term: 0.94, gul: 0.96, conversion: "Permanent conversion options" },
  { id: "prudential", name: "Prudential", rating: "A+", term: 0.99, gul: 0.98, conversion: "Product-specific conversion privileges" },
  { id: "john-hancock", name: "John Hancock", rating: "A+", term: 1.01, gul: 0.95, conversion: "Vitality-oriented upgrade path" },
  { id: "mutual-of-omaha", name: "Mutual of Omaha", rating: "A+", term: 0.96, gul: 1.08, conversion: "Conversion varies by product" },
  { id: "nationwide", name: "Nationwide", rating: "A", term: 0.98, gul: 0.97, conversion: "Eligible products subject to state rules" },
  { id: "lincoln", name: "Lincoln Financial", rating: "A", term: 1.02, gul: 0.95, conversion: "Permanent product conversion options" },
  { id: "transamerica", name: "Transamerica", rating: "A", term: 0.97, gul: 1.02, conversion: "Convertible during allowed period" },
  { id: "massmutual", name: "MassMutual", rating: "A++", term: 1.08, gul: 0.92, conversion: "Strong permanent planning fit" },
  { id: "guardian", name: "Guardian", rating: "A++", term: 1.07, gul: 0.93, conversion: "Permanent conversion subject to limits" },
  { id: "north-american", name: "North American", rating: "A+", term: 0.95, gul: 0.98, conversion: "Eligible term conversion window" },
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

function simulateQuote(request: QuoteRequest, carrier: (typeof carriers)[number], productType: "Term" | "GUL", index: number): QuoteOption {
  const productFactor = productType === "Term" ? carrier.term : carrier.gul * 1.55;
  const stateFactor = ["NY", "CA", "FL"].includes(request.state) ? 1.03 : 1;
  const variation = 1 + ((index % 5) - 2) * 0.012;
  const monthlyPremium = roundMoney(baseRate(request) * productFactor * stateFactor * variation);
  const annualPremium = roundMoney(monthlyPremium * 11.6);
  const fitScore = Math.max(74, Math.min(99, Math.round(100 - productFactor * 8 + (carrier.rating === "A++" ? 3 : carrier.rating === "A+" ? 2 : 0) - index * 0.35)));

  return {
    quoteId: `${carrier.id.toUpperCase().replaceAll("-", "").slice(0, 5)}-${productType}-${request.state}-${index + 1}`,
    carrierId: carrier.id,
    carrierName: carrier.name,
    productName: productType === "Term" ? `${request.termLength}-Year Level Term` : "Guaranteed Universal Life",
    productType,
    monthlyPremium,
    annualPremium,
    amBestRating: carrier.rating,
    termLength: request.termLength,
    conversion: carrier.conversion,
    highlights: [
      productType === "Term" ? "Lowest-cost death benefit focus" : "Lifetime-oriented coverage path",
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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.post("/api/quotes", (req, res) => {
    const parsed = quoteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid quote request", issues: parsed.error.issues });
    }

    const options = carriers
      .flatMap((carrier, index) => [simulateQuote(parsed.data, carrier, "Term", index), simulateQuote(parsed.data, carrier, "GUL", index + carriers.length)])
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium)
      .slice(0, 18);

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

    const estimatedAnnualPremium = 1_650;
    const response: AssignmentResponse = {
      assignmentId: `AOR-${Date.now().toString(36).toUpperCase()}`,
      assignedAgent: {
        name: "Maya Thompson",
        agency: "PolicyQuoters Licensed Partner Network",
        licenseStates: [parsed.data.intake.quoteId.includes("-NY-") ? "NY" : "FL", "TX", "CA", "PA"],
        carrierAppointments: ["Banner Life", "Protective", "Pacific Life", "Prudential"],
        phone: "(800) 555-0148",
      },
      assignmentFee: assignmentFee(estimatedAnnualPremium),
      status: "assigned",
      nextSteps: [
        "Agent receives selected quote and signed consent packet.",
        "Application handoff is prepared for FireLight or carrier eApp.",
        "Customer receives application-start confirmation and status tracker.",
      ],
    };

    return res.json(response);
  });

  return httpServer;
}
