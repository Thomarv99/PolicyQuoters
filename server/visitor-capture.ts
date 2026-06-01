// Persistence for visitor capture events received from the GetEmails (GE)
// webhook. When DATABASE_URL is set, reads/writes go to Postgres (Supabase);
// otherwise an in-process in-memory store is used so local/dev runs work
// without a database. See README_RENDER.md.
import { getPersistenceStatus, hasDatabaseUrl, isDatabaseInitialized, query } from "./db";

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

export type VisitorCaptureEnrichment = {
  enrichmentStatus?: string;
  enrichmentProvider?: string;
  enrichmentRequestedAt?: string;
  enrichmentCompletedAt?: string;
  enrichmentError?: string;
  enrichmentPayload?: unknown;
};

export type VisitorCaptureEvent = VisitorCaptureInput &
  VisitorCaptureEnrichment & {
    id: string;
    receivedAt: string;
  };

const memEvents = new Map<string, VisitorCaptureEvent>();

function useDb(): boolean {
  return hasDatabaseUrl() && isDatabaseInitialized();
}

export type VisitorCaptureStorageStatus = {
  // "database" when reads/writes hit Postgres; "memory" when using the volatile
  // in-process store (data is lost on every redeploy/restart).
  backend: "database" | "memory";
  databaseUrlConfigured: boolean;
  databaseInitialized: boolean;
  databaseInitFailed: boolean;
  // True when production is silently running on in-memory storage. The admin UI
  // surfaces this so an empty list isn't mistaken for "no captures yet".
  persistenceDegraded: boolean;
  memoryEventCount: number;
};

// Reports how captured visitor events are being stored. Contains no secrets or
// connection strings — only booleans/counts safe to show in the admin UI.
export function getVisitorCaptureStorageStatus(): VisitorCaptureStorageStatus {
  const status = getPersistenceStatus();
  return {
    backend: status.backend,
    databaseUrlConfigured: status.databaseUrlConfigured,
    databaseInitialized: status.databaseInitialized,
    databaseInitFailed: status.databaseInitFailed,
    // Degraded only matters in production: a missing/broken DB there means
    // captures are being dropped on restart, which is the bug we surface.
    persistenceDegraded: status.persistenceDegraded,
    memoryEventCount: memEvents.size,
  };
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
    enrichmentStatus: (row.enrichment_status as string | null) ?? undefined,
    enrichmentProvider: (row.enrichment_provider as string | null) ?? undefined,
    enrichmentRequestedAt: row.enrichment_requested_at
      ? new Date(row.enrichment_requested_at as string).toISOString()
      : undefined,
    enrichmentCompletedAt: row.enrichment_completed_at
      ? new Date(row.enrichment_completed_at as string).toISOString()
      : undefined,
    enrichmentError: (row.enrichment_error as string | null) ?? undefined,
    enrichmentPayload: (row.enrichment_payload as unknown) ?? undefined,
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

// Persists the outcome of a Versium enrichment attempt onto an existing event.
// Safe to call from background tasks; returns the updated event or null if the
// event no longer exists.
export async function updateVisitorCaptureEnrichment(
  id: string,
  enrichment: VisitorCaptureEnrichment,
): Promise<VisitorCaptureEvent | null> {
  if (useDb()) {
    const result = await query(
      `UPDATE visitor_capture_events SET
        enrichment_status = $2,
        enrichment_provider = $3,
        enrichment_requested_at = $4,
        enrichment_completed_at = $5,
        enrichment_error = $6,
        enrichment_payload = $7::jsonb
      WHERE id = $1
      RETURNING *`,
      [
        id,
        enrichment.enrichmentStatus ?? null,
        enrichment.enrichmentProvider ?? null,
        enrichment.enrichmentRequestedAt ?? null,
        enrichment.enrichmentCompletedAt ?? null,
        enrichment.enrichmentError ?? null,
        enrichment.enrichmentPayload === undefined
          ? null
          : JSON.stringify(enrichment.enrichmentPayload),
      ],
    );
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }

  const existing = memEvents.get(id);
  if (!existing) return null;
  const updated: VisitorCaptureEvent = { ...existing, ...enrichment };
  memEvents.set(id, updated);
  return updated;
}

export async function getVisitorCaptureEvent(id: string): Promise<VisitorCaptureEvent | null> {
  if (useDb()) {
    const result = await query("SELECT * FROM visitor_capture_events WHERE id = $1", [id]);
    return result.rows[0] ? rowToEvent(result.rows[0]) : null;
  }
  return memEvents.get(id) ?? null;
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
