// Persistence for landing pages, quote submissions, and leads.
// When DATABASE_URL is set, all reads/writes go to Postgres (Supabase).
// Otherwise, an in-process in-memory store is used so local/dev runs work
// without any database. See README_RENDER.md.
import type {
  LandingContact,
  LandingLead,
  LandingPage,
  LandingPageInput,
  LandingPagePublic,
  LandingQuoteAnswers,
  LandingQuoteOption,
} from "@shared/schema";
import { ensureDatabaseReady, hasDatabaseUrl, isDatabaseInitialized, query } from "./db";

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export type SubmissionRecord = {
  id: string;
  landingPageId: string;
  contact: LandingContact;
  answers: LandingQuoteAnswers;
  options: LandingQuoteOption[];
  source: "hexure" | "mock";
  selectedQuoteId?: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// In-memory fallback (used when DATABASE_URL is not set)
// ---------------------------------------------------------------------------
const memLandingPages = new Map<string, LandingPage>();
const memSubmissions = new Map<string, SubmissionRecord>();
const memLeads = new Map<string, LandingLead>();

function useDb(): boolean {
  return hasDatabaseUrl() && isDatabaseInitialized();
}

export function publicLandingPage(page: LandingPage): LandingPagePublic {
  return {
    id: page.id,
    slug: page.slug,
    name: page.name,
    headline: page.headline,
    subheadline: page.subheadline,
    active: page.active,
    agent: {
      displayName: page.agentDisplayName,
      title: page.agentDisplayTitle,
    },
    licensedStates: page.licensedStates,
    licensedCarriers: page.licensedCarriers,
    metaPixelId: page.metaPixelId || undefined,
  };
}

function rowToLandingPage(row: Record<string, unknown>): LandingPage {
  return {
    id: row.id as string,
    name: row.name as string,
    slug: row.slug as string,
    agentId: row.agent_id as string,
    agentDisplayName: row.agent_display_name as string,
    agentDisplayTitle: (row.agent_display_title as string | null) ?? undefined,
    agentPhone: (row.agent_phone as string | null) ?? undefined,
    agentEmail: (row.agent_email as string | null) ?? undefined,
    licensedStates: (row.licensed_states as string[]) ?? [],
    licensedCarriers: (row.licensed_carriers as string[]) ?? [],
    headline: (row.headline as string | null) ?? undefined,
    subheadline: (row.subheadline as string | null) ?? undefined,
    active: Boolean(row.active),
    metaPixelId: (row.meta_pixel_id as string | null) ?? undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

function rowToSubmission(row: Record<string, unknown>): SubmissionRecord {
  return {
    id: row.id as string,
    landingPageId: row.landing_page_id as string,
    contact: row.contact as LandingContact,
    answers: row.answers as LandingQuoteAnswers,
    options: row.options as LandingQuoteOption[],
    source: row.source as "hexure" | "mock",
    selectedQuoteId: (row.selected_quote_id as string | null) ?? undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
  };
}

function rowToLead(row: Record<string, unknown>): LandingLead {
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    landingPageId: row.landing_page_id as string,
    landingPageSlug: row.landing_page_slug as string,
    landingPageName: row.landing_page_name as string,
    agentId: row.agent_id as string,
    agentDisplayName: row.agent_display_name as string,
    contact: row.contact as LandingContact,
    answers: row.answers as LandingQuoteAnswers,
    options: row.options as LandingQuoteOption[],
    selectedQuote: (row.selected_quote as LandingQuoteOption | null) ?? undefined,
    status: row.status as LandingLead["status"],
    source: row.source as "hexure" | "mock",
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
  };
}

export async function listLandingPages(): Promise<LandingPage[]> {
  if (useDb()) {
    const result = await query("SELECT * FROM landing_pages ORDER BY created_at DESC");
    return result.rows.map(rowToLandingPage);
  }
  return Array.from(memLandingPages.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getLandingPageBySlug(slug: string): Promise<LandingPage | undefined> {
  const normalized = slug.toLowerCase();
  if (useDb()) {
    const result = await query("SELECT * FROM landing_pages WHERE LOWER(slug) = $1 LIMIT 1", [normalized]);
    return result.rows[0] ? rowToLandingPage(result.rows[0]) : undefined;
  }
  return Array.from(memLandingPages.values()).find((page) => page.slug.toLowerCase() === normalized);
}

export async function getLandingPageById(id: string): Promise<LandingPage | undefined> {
  if (useDb()) {
    const result = await query("SELECT * FROM landing_pages WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] ? rowToLandingPage(result.rows[0]) : undefined;
  }
  return memLandingPages.get(id);
}

export async function createLandingPage(input: LandingPageInput): Promise<LandingPage> {
  const existing = await getLandingPageBySlug(input.slug);
  if (existing) {
    throw new Error(`A landing page with slug "${input.slug}" already exists.`);
  }
  const id = randomId("LP");
  const slug = input.slug.toLowerCase();
  const now = nowIso();

  if (useDb()) {
    const result = await query(
      `INSERT INTO landing_pages (
        id, name, slug, agent_id, agent_display_name, agent_display_title,
        agent_phone, agent_email, licensed_states, licensed_carriers,
        headline, subheadline, active, meta_pixel_id, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12,$13,$14,$15,$16)
      RETURNING *`,
      [
        id,
        input.name,
        slug,
        input.agentId,
        input.agentDisplayName,
        input.agentDisplayTitle ?? null,
        input.agentPhone ?? null,
        input.agentEmail || null,
        JSON.stringify(input.licensedStates),
        JSON.stringify(input.licensedCarriers),
        input.headline ?? null,
        input.subheadline ?? null,
        input.active,
        input.metaPixelId || null,
        now,
        now,
      ],
    );
    return rowToLandingPage(result.rows[0]);
  }

  const created: LandingPage = {
    ...input,
    metaPixelId: input.metaPixelId || undefined,
    slug,
    id,
    createdAt: now,
    updatedAt: now,
  };
  memLandingPages.set(id, created);
  return created;
}

export async function updateLandingPage(id: string, input: LandingPageInput): Promise<LandingPage | undefined> {
  const current = await getLandingPageById(id);
  if (!current) return undefined;
  const slugConflict = await getLandingPageBySlug(input.slug);
  if (slugConflict && slugConflict.id !== id) {
    throw new Error(`A landing page with slug "${input.slug}" already exists.`);
  }
  const slug = input.slug.toLowerCase();
  const now = nowIso();

  if (useDb()) {
    const result = await query(
      `UPDATE landing_pages SET
        name=$2, slug=$3, agent_id=$4, agent_display_name=$5, agent_display_title=$6,
        agent_phone=$7, agent_email=$8, licensed_states=$9::jsonb, licensed_carriers=$10::jsonb,
        headline=$11, subheadline=$12, active=$13, meta_pixel_id=$14, updated_at=$15
      WHERE id=$1 RETURNING *`,
      [
        id,
        input.name,
        slug,
        input.agentId,
        input.agentDisplayName,
        input.agentDisplayTitle ?? null,
        input.agentPhone ?? null,
        input.agentEmail || null,
        JSON.stringify(input.licensedStates),
        JSON.stringify(input.licensedCarriers),
        input.headline ?? null,
        input.subheadline ?? null,
        input.active,
        input.metaPixelId || null,
        now,
      ],
    );
    return result.rows[0] ? rowToLandingPage(result.rows[0]) : undefined;
  }

  const updated: LandingPage = {
    ...current,
    ...input,
    metaPixelId: input.metaPixelId || undefined,
    slug,
    updatedAt: now,
  };
  memLandingPages.set(id, updated);
  return updated;
}

export async function deleteLandingPage(id: string): Promise<boolean> {
  if (useDb()) {
    const result = await query("DELETE FROM landing_pages WHERE id = $1", [id]);
    return (result.rowCount ?? 0) > 0;
  }
  return memLandingPages.delete(id);
}

export async function recordSubmission(
  record: Omit<SubmissionRecord, "createdAt" | "id"> & { id?: string },
): Promise<SubmissionRecord> {
  const id = record.id ?? randomId("SUB");
  const createdAt = nowIso();
  if (useDb()) {
    const result = await query(
      `INSERT INTO submissions (
        id, landing_page_id, contact, answers, options, source, selected_quote_id, created_at
      ) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6,$7,$8)
      RETURNING *`,
      [
        id,
        record.landingPageId,
        JSON.stringify(record.contact),
        JSON.stringify(record.answers),
        JSON.stringify(record.options),
        record.source,
        record.selectedQuoteId ?? null,
        createdAt,
      ],
    );
    return rowToSubmission(result.rows[0]);
  }
  const stored: SubmissionRecord = {
    id,
    landingPageId: record.landingPageId,
    contact: record.contact,
    answers: record.answers,
    options: record.options,
    source: record.source,
    selectedQuoteId: record.selectedQuoteId,
    createdAt,
  };
  memSubmissions.set(id, stored);
  return stored;
}

export async function getSubmission(id: string): Promise<SubmissionRecord | undefined> {
  if (useDb()) {
    const result = await query("SELECT * FROM submissions WHERE id = $1 LIMIT 1", [id]);
    return result.rows[0] ? rowToSubmission(result.rows[0]) : undefined;
  }
  return memSubmissions.get(id);
}

export async function selectQuote(submissionId: string, quoteId: string): Promise<LandingLead | undefined> {
  const submission = await getSubmission(submissionId);
  if (!submission) return undefined;
  const selected = submission.options.find((option) => option.quoteId === quoteId);
  if (!selected) return undefined;
  const page = await getLandingPageById(submission.landingPageId);
  if (!page) return undefined;

  const now = nowIso();

  if (useDb()) {
    await query("UPDATE submissions SET selected_quote_id = $1 WHERE id = $2", [quoteId, submissionId]);
    const existing = await query("SELECT * FROM leads WHERE submission_id = $1 LIMIT 1", [submissionId]);
    if (existing.rows[0]) {
      const updated = await query(
        `UPDATE leads SET selected_quote = $1::jsonb, status = 'selected', updated_at = $2
         WHERE submission_id = $3 RETURNING *`,
        [JSON.stringify(selected), now, submissionId],
      );
      return rowToLead(updated.rows[0]);
    }
    const id = randomId("LEAD");
    const inserted = await query(
      `INSERT INTO leads (
        id, submission_id, landing_page_id, landing_page_slug, landing_page_name,
        agent_id, agent_display_name, contact, answers, options, selected_quote,
        status, source, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15)
      RETURNING *`,
      [
        id,
        submissionId,
        page.id,
        page.slug,
        page.name,
        page.agentId,
        page.agentDisplayName,
        JSON.stringify(submission.contact),
        JSON.stringify(submission.answers),
        JSON.stringify(submission.options),
        JSON.stringify(selected),
        "selected",
        submission.source,
        now,
        now,
      ],
    );
    return rowToLead(inserted.rows[0]);
  }

  submission.selectedQuoteId = quoteId;
  memSubmissions.set(submission.id, submission);

  const existing = Array.from(memLeads.values()).find((lead) => lead.submissionId === submissionId);
  if (existing) {
    existing.selectedQuote = selected;
    existing.status = "selected";
    existing.updatedAt = now;
    return existing;
  }

  const lead: LandingLead = {
    id: randomId("LEAD"),
    submissionId,
    landingPageId: page.id,
    landingPageSlug: page.slug,
    landingPageName: page.name,
    agentId: page.agentId,
    agentDisplayName: page.agentDisplayName,
    contact: submission.contact,
    answers: submission.answers,
    options: submission.options,
    selectedQuote: selected,
    status: "selected",
    source: submission.source,
    createdAt: now,
    updatedAt: now,
  };
  memLeads.set(lead.id, lead);
  return lead;
}

export async function listLeadsForAgent(agentId?: string): Promise<LandingLead[]> {
  if (useDb()) {
    if (agentId) {
      const result = await query(
        "SELECT * FROM leads WHERE agent_id = $1 ORDER BY created_at DESC",
        [agentId],
      );
      return result.rows.map(rowToLead);
    }
    const result = await query("SELECT * FROM leads ORDER BY created_at DESC");
    return result.rows.map(rowToLead);
  }
  const all = Array.from(memLeads.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (!agentId) return all;
  return all.filter((lead) => lead.agentId === agentId);
}

export async function listAllLeads(): Promise<LandingLead[]> {
  return listLeadsForAgent(undefined);
}

export async function seedLandingPages(
  agents: Array<{ id: string; name: string; phone: string; email: string; licenseStates: string[]; carrierAppointments: string[]; agency: string }>,
): Promise<void> {
  const primary = agents[0];
  if (!primary) return;

  // Make sure the DB is ready (creates schema on first call).
  if (hasDatabaseUrl()) {
    await ensureDatabaseReady();
  }

  const existing = await listLandingPages();
  if (existing.length > 0) return;

  await createLandingPage({
    name: `${primary.name.split(" ")[0]} - Family Life Coverage`,
    slug: "family-life",
    agentId: primary.id,
    agentDisplayName: primary.name,
    agentDisplayTitle: `Licensed agent · ${primary.agency}`,
    agentPhone: primary.phone,
    agentEmail: primary.email,
    licensedStates: primary.licenseStates,
    licensedCarriers: primary.carrierAppointments,
    headline: "Affordable life insurance for your family",
    subheadline: "See real quotes from top-rated carriers in under a minute.",
    active: true,
  });
}
