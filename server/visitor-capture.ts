// Persistence for visitor capture events received from the GetEmails (GE)
// webhook. When DATABASE_URL is set, reads/writes go to Postgres (Supabase);
// otherwise an in-process in-memory store is used so local/dev runs work
// without a database. See README_RENDER.md.
import { hasDatabaseUrl, isDatabaseInitialized, query } from "./db";

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export type VisitorCaptureInput = {
  source?: string;
  accountKey?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  pageUrl?: string;
  referrer?: string;
  ipAddress?: string;
  userAgent?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  rawPayload: unknown;
};

export type VisitorCaptureEvent = VisitorCaptureInput & {
  id: string;
  receivedAt: string;
};

const memEvents = new Map<string, VisitorCaptureEvent>();

function useDb(): boolean {
  return hasDatabaseUrl() && isDatabaseInitialized();
}

function rowToEvent(row: Record<string, unknown>): VisitorCaptureEvent {
  return {
    id: row.id as string,
    source: (row.source as string | null) ?? undefined,
    accountKey: (row.account_key as string | null) ?? undefined,
    email: (row.email as string | null) ?? undefined,
    firstName: (row.first_name as string | null) ?? undefined,
    lastName: (row.last_name as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    pageUrl: (row.page_url as string | null) ?? undefined,
    referrer: (row.referrer as string | null) ?? undefined,
    ipAddress: (row.ip_address as string | null) ?? undefined,
    userAgent: (row.user_agent as string | null) ?? undefined,
    utmSource: (row.utm_source as string | null) ?? undefined,
    utmMedium: (row.utm_medium as string | null) ?? undefined,
    utmCampaign: (row.utm_campaign as string | null) ?? undefined,
    rawPayload: row.raw_payload as unknown,
    receivedAt: new Date(row.received_at as string).toISOString(),
  };
}

export async function recordVisitorCaptureEvent(input: VisitorCaptureInput): Promise<VisitorCaptureEvent> {
  const id = randomId("VCE");
  const receivedAt = nowIso();

  if (useDb()) {
    const result = await query(
      `INSERT INTO visitor_capture_events (
        id, source, account_key, email, first_name, last_name, phone,
        page_url, referrer, ip_address, user_agent, utm_source, utm_medium,
        utm_campaign, raw_payload, received_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16)
      RETURNING *`,
      [
        id,
        input.source ?? null,
        input.accountKey ?? null,
        input.email ?? null,
        input.firstName ?? null,
        input.lastName ?? null,
        input.phone ?? null,
        input.pageUrl ?? null,
        input.referrer ?? null,
        input.ipAddress ?? null,
        input.userAgent ?? null,
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
        JSON.stringify(input.rawPayload ?? null),
        receivedAt,
      ],
    );
    return rowToEvent(result.rows[0]);
  }

  const stored: VisitorCaptureEvent = { ...input, id, receivedAt };
  memEvents.set(id, stored);
  return stored;
}

export async function listVisitorCaptureEvents(limit: number): Promise<VisitorCaptureEvent[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 0, 1), 1000);
  if (useDb()) {
    const result = await query(
      "SELECT * FROM visitor_capture_events ORDER BY received_at DESC LIMIT $1",
      [safeLimit],
    );
    return result.rows.map(rowToEvent);
  }
  return Array.from(memEvents.values())
    .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1))
    .slice(0, safeLimit);
}
