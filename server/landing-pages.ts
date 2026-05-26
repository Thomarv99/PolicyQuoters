// MVP prototype persistence for landing pages, submissions, and leads.
// NOTE: This uses an in-process in-memory store so the prototype is fast to ship.
// For production deployment on Render, move this to Supabase (or another managed
// database) — see README_RENDER.md for the migration plan.
import type {
  LandingContact,
  LandingLead,
  LandingPage,
  LandingPageInput,
  LandingPagePublic,
  LandingQuoteAnswers,
  LandingQuoteOption,
} from "@shared/schema";

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

const landingPages = new Map<string, LandingPage>();
const submissions = new Map<string, SubmissionRecord>();
const leads = new Map<string, LandingLead>();

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
  };
}

export function listLandingPages(): LandingPage[] {
  return Array.from(landingPages.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getLandingPageBySlug(slug: string): LandingPage | undefined {
  const normalized = slug.toLowerCase();
  return Array.from(landingPages.values()).find((page) => page.slug.toLowerCase() === normalized);
}

export function getLandingPageById(id: string): LandingPage | undefined {
  return landingPages.get(id);
}

export function createLandingPage(input: LandingPageInput): LandingPage {
  const existing = getLandingPageBySlug(input.slug);
  if (existing) {
    throw new Error(`A landing page with slug "${input.slug}" already exists.`);
  }
  const id = randomId("LP");
  const created: LandingPage = {
    ...input,
    slug: input.slug.toLowerCase(),
    id,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  landingPages.set(id, created);
  return created;
}

export function updateLandingPage(id: string, input: LandingPageInput): LandingPage | undefined {
  const current = landingPages.get(id);
  if (!current) return undefined;
  const slugConflict = getLandingPageBySlug(input.slug);
  if (slugConflict && slugConflict.id !== id) {
    throw new Error(`A landing page with slug "${input.slug}" already exists.`);
  }
  const updated: LandingPage = {
    ...current,
    ...input,
    slug: input.slug.toLowerCase(),
    updatedAt: nowIso(),
  };
  landingPages.set(id, updated);
  return updated;
}

export function deleteLandingPage(id: string): boolean {
  return landingPages.delete(id);
}

export function recordSubmission(record: Omit<SubmissionRecord, "createdAt" | "id"> & { id?: string }): SubmissionRecord {
  const id = record.id ?? randomId("SUB");
  const stored: SubmissionRecord = {
    id,
    landingPageId: record.landingPageId,
    contact: record.contact,
    answers: record.answers,
    options: record.options,
    source: record.source,
    selectedQuoteId: record.selectedQuoteId,
    createdAt: nowIso(),
  };
  submissions.set(id, stored);
  return stored;
}

export function getSubmission(id: string) {
  return submissions.get(id);
}

export function selectQuote(submissionId: string, quoteId: string): LandingLead | undefined {
  const submission = submissions.get(submissionId);
  if (!submission) return undefined;
  const selected = submission.options.find((option) => option.quoteId === quoteId);
  if (!selected) return undefined;
  const page = landingPages.get(submission.landingPageId);
  if (!page) return undefined;

  submission.selectedQuoteId = quoteId;

  const existing = Array.from(leads.values()).find((lead) => lead.submissionId === submissionId);
  if (existing) {
    existing.selectedQuote = selected;
    existing.status = "selected";
    existing.updatedAt = nowIso();
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
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  leads.set(lead.id, lead);
  return lead;
}

export function listLeadsForAgent(agentId?: string): LandingLead[] {
  const all = Array.from(leads.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  if (!agentId) return all;
  return all.filter((lead) => lead.agentId === agentId);
}

export function listAllLeads(): LandingLead[] {
  return Array.from(leads.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function seedLandingPages(agents: Array<{ id: string; name: string; phone: string; email: string; licenseStates: string[]; carrierAppointments: string[]; agency: string }>) {
  if (landingPages.size > 0) return;
  const primary = agents[0];
  if (!primary) return;
  createLandingPage({
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
