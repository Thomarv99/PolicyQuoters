// Hexure Sandbox Quoting API integration.
// If HEXURE_API_BASE_URL and HEXURE_API_KEY are present, we call Hexure for quotes.
// Otherwise we return realistic mock quotes filtered to the landing page's carriers
// so the funnel is fully testable today.
import type { LandingPage, LandingQuoteAnswers, LandingQuoteOption } from "@shared/schema";

type HexureCarrierResult = {
  carrier_name?: string;
  carrierName?: string;
  product_name?: string;
  productName?: string;
  product_type?: string;
  productType?: string;
  monthly_premium?: number;
  monthlyPremium?: number;
  annual_premium?: number;
  annualPremium?: number;
  face_amount?: number;
  faceAmount?: number;
  term_length?: number;
  termLength?: number;
  am_best_rating?: string;
  amBestRating?: string;
  quote_id?: string;
  quoteId?: string;
};

const HEALTH_FACTOR: Record<LandingQuoteAnswers["health"], number> = {
  excellent: 0.78,
  great: 0.92,
  good: 1.08,
  fair: 1.32,
  poor: 1.65,
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function mockCarrierFactor(carrierName: string) {
  const seed = carrierName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 0.9 + ((seed % 30) / 100);
}

function mockAmBestRating(carrierName: string) {
  const seed = carrierName.charCodeAt(0) + carrierName.length;
  const ratings = ["A++", "A+", "A", "A-"];
  return ratings[seed % ratings.length];
}

export function buildMockQuotes(page: LandingPage, answers: LandingQuoteAnswers): LandingQuoteOption[] {
  const ageFactor = 1 + Math.max(0, answers.age - 30) * 0.052;
  const coverageFactor = answers.coverageAmount / 100_000;
  const genderFactor = answers.gender === "female" ? 0.9 : 1;
  const smokerFactor = answers.smoker ? 2.05 : 1;
  const healthFactor = HEALTH_FACTOR[answers.health];

  const termLengths = [10, 20, 30];
  return page.licensedCarriers.flatMap((carrier, carrierIndex) => {
    const carrierFactor = mockCarrierFactor(carrier);
    const amBest = mockAmBestRating(carrier);
    return termLengths.map((term, termIndex) => {
      const termFactor = term / 20;
      const monthly = roundMoney(
        coverageFactor * ageFactor * termFactor * genderFactor * smokerFactor * healthFactor * carrierFactor * 1.85,
      );
      const annual = roundMoney(monthly * 11.4);
      return {
        quoteId: `MOCK-${page.slug.toUpperCase()}-${carrier.replace(/\s+/g, "").slice(0, 6).toUpperCase()}-${term}-${carrierIndex}-${termIndex}`,
        carrierName: carrier,
        productName: `${term}-Year Level Term Life`,
        productType: "Term Life",
        coverageAmount: answers.coverageAmount,
        termLength: term,
        monthlyPremium: monthly,
        annualPremium: annual,
        amBestRating: amBest,
        source: "mock" as const,
        highlights: [
          `${term}-year level premium`,
          answers.smoker ? "Tobacco class pricing" : "Non-tobacco class",
          `${amBest} AM Best rating`,
        ],
      };
    });
  });
}

function normalizeHexureOption(raw: HexureCarrierResult, fallbackCoverage: number, fallbackTerm: number): LandingQuoteOption | undefined {
  const carrierName = raw.carrier_name ?? raw.carrierName;
  if (!carrierName) return undefined;
  const monthly = raw.monthly_premium ?? raw.monthlyPremium;
  const annual = raw.annual_premium ?? raw.annualPremium ?? (typeof monthly === "number" ? monthly * 12 : undefined);
  if (typeof monthly !== "number" || typeof annual !== "number") return undefined;
  const termLength = raw.term_length ?? raw.termLength ?? fallbackTerm;
  return {
    quoteId: raw.quote_id ?? raw.quoteId ?? `HEXURE-${carrierName.replace(/\s+/g, "").toUpperCase()}-${termLength}`,
    carrierName,
    productName: raw.product_name ?? raw.productName ?? `${termLength}-Year Term Life`,
    productType: raw.product_type ?? raw.productType ?? "Term Life",
    coverageAmount: raw.face_amount ?? raw.faceAmount ?? fallbackCoverage,
    termLength,
    monthlyPremium: roundMoney(monthly),
    annualPremium: roundMoney(annual),
    amBestRating: raw.am_best_rating ?? raw.amBestRating,
    source: "hexure",
    highlights: [`${termLength}-year level premium`, raw.am_best_rating ?? raw.amBestRating ?? "Rated carrier"],
  };
}

export async function fetchHexureQuotes(page: LandingPage, answers: LandingQuoteAnswers): Promise<LandingQuoteOption[] | undefined> {
  const baseUrl = process.env.HEXURE_API_BASE_URL;
  const apiKey = process.env.HEXURE_API_KEY;
  if (!baseUrl || !apiKey) return undefined;

  const allowedCarriers = page.licensedCarriers;
  const payload = {
    state: answers.state,
    age: answers.age,
    gender: answers.gender,
    face_amount: answers.coverageAmount,
    smoker: answers.smoker,
    health_class: answers.health,
    carriers: allowedCarriers,
    term_lengths: [10, 20, 30],
  };

  const url = `${baseUrl.replace(/\/$/, "")}/quotes`;
  const accountId = process.env.HEXURE_ACCOUNT_ID;
  const env = process.env.HEXURE_ENV ?? "sandbox";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(accountId ? { "X-Hexure-Account": accountId } : {}),
        "X-Hexure-Env": env,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      console.warn(`[hexure] Sandbox responded ${response.status}; falling back to mock.`);
      return undefined;
    }
    const body = await response.json();
    const rawList: HexureCarrierResult[] = Array.isArray(body) ? body : body.quotes ?? body.results ?? body.options ?? [];
    const normalized = rawList
      .map((item) => normalizeHexureOption(item, answers.coverageAmount, 20))
      .filter((option): option is LandingQuoteOption => Boolean(option));

    const allowed = new Set(allowedCarriers.map((carrier) => carrier.toLowerCase()));
    return normalized.filter((option) => allowed.has(option.carrierName.toLowerCase()));
  } catch (error) {
    console.warn("[hexure] Quote request failed; falling back to mock.", error);
    return undefined;
  }
}

export function filterQuotesByLandingPage(options: LandingQuoteOption[], page: LandingPage): LandingQuoteOption[] {
  const allowed = new Set(page.licensedCarriers.map((carrier) => carrier.toLowerCase()));
  return options.filter((option) => allowed.has(option.carrierName.toLowerCase()));
}
