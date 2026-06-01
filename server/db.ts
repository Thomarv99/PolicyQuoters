import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let initPromise: Promise<void> | null = null;
let initialized = false;
let initFailed = false;

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

function buildPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // Supabase Postgres requires TLS. We accept the Supabase cert chain without
  // explicit CA bundling because Render's outbound TLS validates against the
  // public roots Supabase uses, but we set rejectUnauthorized=false to handle
  // shared-pool pgBouncer endpoints that present chained certs.
  const ssl =
    process.env.DATABASE_SSL === "disable"
      ? undefined
      : { rejectUnauthorized: false };
  return new Pool({
    connectionString,
    ssl,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): pg.Pool | null {
  if (!hasDatabaseUrl()) return null;
  if (initFailed) return null;
  if (!pool) {
    pool = buildPool();
  }
  return pool;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL,
  agent_display_name TEXT NOT NULL,
  agent_display_title TEXT,
  agent_phone TEXT,
  agent_email TEXT,
  licensed_states JSONB NOT NULL DEFAULT '[]'::jsonb,
  licensed_carriers JSONB NOT NULL DEFAULT '[]'::jsonb,
  headline TEXT,
  subheadline TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  meta_pixel_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Forward-compatible: add the column for existing deployments.
ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT;

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  landing_page_id TEXT NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  contact JSONB NOT NULL,
  answers JSONB NOT NULL,
  options JSONB NOT NULL,
  source TEXT NOT NULL,
  selected_quote_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS submissions_landing_page_idx ON submissions(landing_page_id);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE,
  landing_page_id TEXT NOT NULL,
  landing_page_slug TEXT NOT NULL,
  landing_page_name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_display_name TEXT NOT NULL,
  contact JSONB NOT NULL,
  answers JSONB NOT NULL,
  options JSONB NOT NULL,
  selected_quote JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_agent_idx ON leads(agent_id);
CREATE INDEX IF NOT EXISTS leads_landing_page_idx ON leads(landing_page_id);

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  profile JSONB NOT NULL,
  performance_score INTEGER NOT NULL DEFAULT 0,
  decline_rate REAL NOT NULL DEFAULT 0,
  active_assignments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_profile (
  id TEXT PRIMARY KEY,
  profile JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_cases (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visitor_capture_events (
  id TEXT PRIMARY KEY,
  source TEXT,
  account_key TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  page_url TEXT,
  referrer TEXT,
  ip_address TEXT,
  user_agent TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  raw_payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visitor_capture_events_received_idx ON visitor_capture_events(received_at DESC);
CREATE INDEX IF NOT EXISTS visitor_capture_events_email_idx ON visitor_capture_events(email);

-- Forward-compatible: add Versium contact-enrichment columns for existing deployments.
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_status TEXT;
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_provider TEXT;
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_requested_at TIMESTAMPTZ;
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_completed_at TIMESTAMPTZ;
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_error TEXT;
ALTER TABLE visitor_capture_events ADD COLUMN IF NOT EXISTS enrichment_payload JSONB;
`;

export async function ensureDatabaseReady(): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  if (initialized) return true;
  if (initFailed) return false;
  if (!initPromise) {
    initPromise = (async () => {
      const p = getPool();
      if (!p) {
        initFailed = true;
        return;
      }
      try {
        await p.query(SCHEMA_SQL);
        initialized = true;
        console.log("[db] Postgres persistence initialized (schema ensured).");
      } catch (error) {
        initFailed = true;
        console.error("[db] Failed to initialize Postgres schema:", (error as Error).message);
        throw error;
      }
    })();
  }
  try {
    await initPromise;
  } catch {
    return false;
  }
  return initialized;
}

export function isDatabaseInitialized(): boolean {
  return initialized;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  const p = getPool();
  if (!p) {
    throw new Error("Database is not configured");
  }
  return p.query<T>(text, params as never);
}
