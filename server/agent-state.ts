// Persists the mutable agent state (directory, primary profile, agent cases)
// to Postgres when DATABASE_URL is configured. Each entity is stored as a
// JSONB document so the existing in-memory shapes used by routes.ts can be
// hydrated/saved without changing all call sites.
import type { AgentCase, AgentProfile } from "@shared/schema";
import { ensureDatabaseReady, hasDatabaseUrl, isDatabaseInitialized, query } from "./db";

export type AgentDirectoryEntry = AgentProfile & {
  id: string;
  performanceScore: number;
  declineRate: number;
  activeAssignments: number;
};

const AGENT_PROFILE_KEY = "primary";

function useDb(): boolean {
  return hasDatabaseUrl() && isDatabaseInitialized();
}

export async function loadAgentDirectory(): Promise<AgentDirectoryEntry[] | undefined> {
  if (!useDb()) return undefined;
  const result = await query("SELECT id, profile, performance_score, decline_rate, active_assignments FROM agents ORDER BY id ASC");
  if (result.rows.length === 0) return undefined;
  return result.rows.map((row) => ({
    id: row.id as string,
    ...(row.profile as AgentProfile),
    performanceScore: Number(row.performance_score ?? 0),
    declineRate: Number(row.decline_rate ?? 0),
    activeAssignments: Number(row.active_assignments ?? 0),
  }));
}

export async function saveAgentDirectory(directory: AgentDirectoryEntry[]): Promise<void> {
  if (!useDb()) return;
  for (const entry of directory) {
    const { id, performanceScore, declineRate, activeAssignments, ...profile } = entry;
    await query(
      `INSERT INTO agents (id, profile, performance_score, decline_rate, active_assignments, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, $5, now())
       ON CONFLICT (id) DO UPDATE SET
         profile = EXCLUDED.profile,
         performance_score = EXCLUDED.performance_score,
         decline_rate = EXCLUDED.decline_rate,
         active_assignments = EXCLUDED.active_assignments,
         updated_at = now()`,
      [id, JSON.stringify(profile satisfies AgentProfile), performanceScore, declineRate, activeAssignments],
    );
  }
}

export async function loadAgentProfile(): Promise<AgentProfile | undefined> {
  if (!useDb()) return undefined;
  const result = await query("SELECT profile FROM agent_profile WHERE id = $1 LIMIT 1", [AGENT_PROFILE_KEY]);
  return result.rows[0] ? (result.rows[0].profile as AgentProfile) : undefined;
}

export async function saveAgentProfile(profile: AgentProfile): Promise<void> {
  if (!useDb()) return;
  await query(
    `INSERT INTO agent_profile (id, profile, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET profile = EXCLUDED.profile, updated_at = now()`,
    [AGENT_PROFILE_KEY, JSON.stringify(profile)],
  );
}

export async function loadAgentCases(): Promise<AgentCase[] | undefined> {
  if (!useDb()) return undefined;
  const result = await query("SELECT payload FROM agent_cases ORDER BY created_at DESC");
  if (result.rows.length === 0) return undefined;
  return result.rows.map((row) => row.payload as AgentCase);
}

export async function saveAgentCase(agentCase: AgentCase): Promise<void> {
  if (!useDb()) return;
  await query(
    `INSERT INTO agent_cases (id, payload, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
    [agentCase.id, JSON.stringify(agentCase)],
  );
}

export async function saveAllAgentCases(cases: AgentCase[]): Promise<void> {
  if (!useDb()) return;
  for (const agentCase of cases) {
    await saveAgentCase(agentCase);
  }
}

export async function ensureAgentPersistenceReady(): Promise<boolean> {
  if (!hasDatabaseUrl()) return false;
  return ensureDatabaseReady();
}
