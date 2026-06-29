import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type { SessionSummary } from "./model";

export type ListSessionsOptions = {
  codexHome: string;
};

type ThreadRow = {
  archived: number;
  archived_at: number | null;
  created_at_ms: number | null;
  cwd: string;
  git_branch: string | null;
  id: string;
  model: string | null;
  model_provider: string;
  preview: string;
  rollout_path: string;
  source: string;
  title: string;
  tokens_used: number;
  updated_at_ms: number | null;
};

function toIso(ms: number | null): string {
  return ms === null ? "" : new Date(ms).toISOString();
}

function toIsoFromEpoch(epoch: number | null): string | null {
  return epoch === null ? null : new Date(epoch * 1000).toISOString();
}

function mapRow(row: ThreadRow): SessionSummary {
  return {
    archived: row.archived === 1,
    archivedAt: toIsoFromEpoch(row.archived_at),
    branch: row.git_branch,
    createdAt: toIso(row.created_at_ms),
    cwd: row.cwd,
    id: row.id,
    lastActivityAt: toIso(row.updated_at_ms),
    model: row.model ?? "",
    modelProvider: row.model_provider,
    preview: row.preview,
    rolloutPath: row.rollout_path,
    source: row.source,
    title: row.title,
    tokensUsed: row.tokens_used,
  };
}

export async function listSessions(options: ListSessionsOptions): Promise<SessionSummary[]> {
  const dbPath = `${options.codexHome}/state_5.sqlite`;
  if (!existsSync(dbPath)) return [];

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db
      .prepare(
        `SELECT id, title, cwd, source, model, model_provider,
                created_at_ms, updated_at_ms, archived, archived_at,
                tokens_used, preview, git_branch, rollout_path
         FROM threads
         ORDER BY updated_at_ms DESC`,
      )
      .all() as ThreadRow[];
    return rows.map(mapRow);
  } catch {
    return [];
  } finally {
    db.close();
  }
}
