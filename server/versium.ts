// Server-side Versium Contact Append client. Enriches visitor-capture contacts
// with appended phone/email/address data. Configured entirely via env vars; no
// credentials are hardcoded. The API key is never logged.
//
// Docs: https://api-documentation.versium.com/reference/contact-append-api

const CONTACT_APPEND_URL = "https://api.versium.com/v2/contact";

// Allowed output[] values per the Contact Append docs. Only one phone-type
// value may be requested per query, so we enforce that when parsing config.
const PHONE_OUTPUTS = new Set(["phone", "phone_mobile", "phone_multiple", "phone_mobile_multiple"]);
const KNOWN_OUTPUTS = new Set([
  "phone",
  "phone_mobile",
  "phone_multiple",
  "phone_mobile_multiple",
  "email",
  "email_multiple",
  "address",
]);

const DEFAULT_OUTPUTS = ["phone_mobile", "email", "address"];
const DEFAULT_MATCH_TYPE = "indiv";
const DEFAULT_MAX_RECS = 1;
const DEFAULT_TIMEOUT_MS = 9000;

export type VersiumContactInput = {
  email?: string;
  phone?: string;
  first?: string;
  last?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
};

export type VersiumEnrichmentStatus =
  | "skipped"
  | "success"
  | "no_match"
  | "failure";

export type VersiumEnrichmentResult = {
  status: VersiumEnrichmentStatus;
  // For "skipped" this is a reason like "not_configured" or "no_input".
  detail?: string;
  error?: string;
  raw?: unknown;
};

export function isVersiumConfigured(): boolean {
  return Boolean(process.env.VERSIUM_API_KEY && process.env.VERSIUM_API_KEY.trim().length > 0);
}

// Parse VERSIUM_CONTACT_APPEND_OUTPUTS into a validated list. Drops unknown
// values, de-duplicates, and keeps at most one phone-type output to respect the
// API rule that phone/phone_mobile/phone_multiple cannot be combined.
function resolveOutputs(): string[] {
  const raw = process.env.VERSIUM_CONTACT_APPEND_OUTPUTS?.trim();
  const requested = (raw && raw.length > 0 ? raw.split(",") : DEFAULT_OUTPUTS)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0 && KNOWN_OUTPUTS.has(value));

  const outputs: string[] = [];
  let phoneOutputUsed = false;
  for (const value of requested) {
    if (outputs.includes(value)) continue;
    if (PHONE_OUTPUTS.has(value)) {
      if (phoneOutputUsed) continue; // only one phone type per query
      phoneOutputUsed = true;
    }
    outputs.push(value);
  }
  return outputs.length > 0 ? outputs : DEFAULT_OUTPUTS;
}

function resolveMatchType(): string {
  const raw = process.env.VERSIUM_MATCH_TYPE?.trim().toLowerCase();
  return raw === "hhld" ? "hhld" : DEFAULT_MATCH_TYPE;
}

function resolveMaxRecs(): number {
  const raw = Number.parseInt(process.env.VERSIUM_MAX_RECS ?? "", 10);
  if (!Number.isFinite(raw)) return DEFAULT_MAX_RECS;
  return Math.min(Math.max(raw, 1), 100);
}

function resolveTimeoutMs(): number {
  const raw = Number.parseInt(process.env.VERSIUM_TIMEOUT_MS ?? "", 10);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(raw, 1000), 30000);
}

function appendIfPresent(params: URLSearchParams, key: string, value?: string) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) params.set(key, trimmed);
  }
}

function buildQuery(input: VersiumContactInput): URLSearchParams {
  const params = new URLSearchParams();
  for (const output of resolveOutputs()) {
    params.append("output[]", output);
  }
  params.set("match_type", resolveMatchType());
  params.set("cfg_maxrecs", String(resolveMaxRecs()));

  appendIfPresent(params, "email", input.email);
  appendIfPresent(params, "phone", input.phone);
  appendIfPresent(params, "first", input.first);
  appendIfPresent(params, "last", input.last);
  appendIfPresent(params, "address", input.address);
  appendIfPresent(params, "address_2", input.address2);
  appendIfPresent(params, "city", input.city);
  appendIfPresent(params, "state", input.state);
  appendIfPresent(params, "zip", input.zip);
  appendIfPresent(params, "country", input.country);

  return params;
}

// True when there is at least one search input worth sending. Without any
// identifier Versium cannot match, so we skip the call (and the billable usage).
function hasSearchInput(input: VersiumContactInput): boolean {
  return Boolean(
    input.email ||
      input.phone ||
      (input.first && input.last) ||
      (input.address && (input.zip || (input.city && input.state))),
  );
}

// Best-effort detection of whether Versium returned any matched records, across
// the response shapes the Contact Append API uses.
function hasMatches(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const body = raw as Record<string, unknown>;
  const versium = body.versium as Record<string, unknown> | undefined;
  const results = versium?.results ?? body.results;
  if (Array.isArray(results)) return results.length > 0;
  if (results && typeof results === "object") return Object.keys(results).length > 0;
  const numMatched = versium?.num_matches ?? body.num_matches;
  if (typeof numMatched === "number") return numMatched > 0;
  return false;
}

// Calls Versium Contact Append for a single contact. Never throws — all errors
// are caught and returned as a failure result so webhook ingestion is never
// blocked or crashed. The API key is never included in any returned error text.
export async function enrichContact(input: VersiumContactInput): Promise<VersiumEnrichmentResult> {
  const apiKey = process.env.VERSIUM_API_KEY?.trim();
  if (!apiKey) {
    return { status: "skipped", detail: "not_configured" };
  }
  if (!hasSearchInput(input)) {
    return { status: "skipped", detail: "no_input" };
  }

  const url = `${CONTACT_APPEND_URL}?${buildQuery(input).toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-versium-api-Key": apiKey,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    let body: unknown = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw_text: text.slice(0, 2000) };
      }
    }

    if (!response.ok) {
      return {
        status: "failure",
        error: `Versium request failed with HTTP ${response.status}`,
        raw: body,
      };
    }

    if (hasMatches(body)) {
      return { status: "success", raw: body };
    }
    return { status: "no_match", raw: body };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Versium request timed out"
        : error instanceof Error
          ? error.message
          : "Unknown Versium error";
    return { status: "failure", error: message };
  } finally {
    clearTimeout(timeout);
  }
}
