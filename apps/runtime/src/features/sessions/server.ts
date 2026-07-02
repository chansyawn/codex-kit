import { existsSync } from "node:fs";
import { basename } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  SessionFilterOption,
  SessionListQuery,
  SessionListQueryInput,
  SessionsResponse,
  SessionSummary,
} from "./model";

export type ListSessionsOptions = {
  codexHome: string;
  query?: SessionListQueryInput;
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

type FacetKind = "archived" | "project" | "provider";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

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

export function normalizeSessionListQuery(input: SessionListQueryInput = {}): SessionListQuery {
  return {
    archived: normalizeArchived(input.archived),
    page: normalizePositiveInteger(input.page, DEFAULT_PAGE, Number.MAX_SAFE_INTEGER),
    perPage: normalizePositiveInteger(input.perPage, DEFAULT_PER_PAGE, MAX_PER_PAGE),
    project: normalizeStringList(input.project),
    provider: normalizeStringList(input.provider),
    title: normalizeString(input.title),
  };
}

export async function listSessions(options: ListSessionsOptions): Promise<SessionsResponse> {
  const query = normalizeSessionListQuery(options.query);
  const dbPath = `${options.codexHome}/state_5.sqlite`;
  if (!existsSync(dbPath)) return createSessionsResponse([], query);

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = readSessionRows(db, query.title).map(mapRow);

    return createSessionsResponse(rows, query);
  } catch {
    return createSessionsResponse([], query);
  } finally {
    db.close();
  }
}

function readSessionRows(db: DatabaseSync, title: string): ThreadRow[] {
  const titlePattern = `%${escapeLikePattern(title).toLowerCase()}%`;

  return db
    .prepare(
      `SELECT id, title, cwd, source, model, model_provider,
              created_at_ms, updated_at_ms, archived, archived_at,
              tokens_used, preview, git_branch, rollout_path
       FROM threads
       WHERE lower(title) LIKE ? ESCAPE '\\'
       ORDER BY updated_at_ms DESC, id DESC`,
    )
    .all(titlePattern) as ThreadRow[];
}

function createSessionsResponse(
  titleMatchedSessions: SessionSummary[],
  query: SessionListQuery,
): SessionsResponse {
  const filteredSessions = filterSessions(titleMatchedSessions, query);
  const total = filteredSessions.length;
  const totalPages = Math.ceil(total / query.perPage);
  const page = totalPages === 0 ? 1 : Math.min(query.page, totalPages);
  const start = (page - 1) * query.perPage;

  return {
    data: filteredSessions.slice(start, start + query.perPage),
    filters: {
      archived: createArchivedFilters(titleMatchedSessions, query),
      projects: createTextFilters(titleMatchedSessions, query, "project"),
      providers: createTextFilters(titleMatchedSessions, query, "provider"),
    },
    pageInfo: {
      page,
      perPage: query.perPage,
      total,
      totalPages,
    },
  };
}

function filterSessions(sessions: SessionSummary[], query: SessionListQuery): SessionSummary[] {
  return sessions.filter(
    (session) =>
      matchesProject(session, query.project) &&
      matchesProvider(session, query.provider) &&
      matchesArchived(session, query.archived),
  );
}

function createTextFilters(
  sessions: SessionSummary[],
  query: SessionListQuery,
  kind: Extract<FacetKind, "project" | "provider">,
): SessionFilterOption[] {
  const counts = new Map<string, number>();
  const scopedSessions = sessions.filter((session) => matchesOtherFilters(session, query, kind));

  for (const session of scopedSessions) {
    const value = kind === "project" ? session.cwd : session.modelProvider;
    if (!value) continue;

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      count,
      label: kind === "project" ? basename(value) || value : value,
      value,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function createArchivedFilters(
  sessions: SessionSummary[],
  query: SessionListQuery,
): SessionFilterOption<boolean>[] {
  const counts = new Map<boolean, number>([
    [false, 0],
    [true, 0],
  ]);
  const scopedSessions = sessions.filter((session) =>
    matchesOtherFilters(session, query, "archived"),
  );

  for (const session of scopedSessions) {
    counts.set(session.archived, (counts.get(session.archived) ?? 0) + 1);
  }

  return [
    { count: counts.get(false) ?? 0, label: "Active", value: false },
    { count: counts.get(true) ?? 0, label: "Archived", value: true },
  ];
}

function matchesOtherFilters(
  session: SessionSummary,
  query: SessionListQuery,
  excludedKind: FacetKind,
): boolean {
  return (
    (excludedKind === "project" || matchesProject(session, query.project)) &&
    (excludedKind === "provider" || matchesProvider(session, query.provider)) &&
    (excludedKind === "archived" || matchesArchived(session, query.archived))
  );
}

function matchesProject(session: SessionSummary, projects: string[]): boolean {
  return projects.length === 0 || projects.includes(session.cwd);
}

function matchesProvider(session: SessionSummary, providers: string[]): boolean {
  return providers.length === 0 || providers.includes(session.modelProvider);
}

function matchesArchived(session: SessionSummary, archived: boolean | undefined): boolean {
  return archived === undefined || session.archived === archived;
}

function normalizeArchived(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;

  return undefined;
}

function normalizePositiveInteger(value: unknown, fallback: number, max: number): number {
  const parsed =
    typeof value === "number" || typeof value === "string"
      ? Number.parseInt(String(value), 10)
      : NaN;
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(Math.floor(parsed), max);
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  const uniqueValues = new Set<string>();

  for (const item of values) {
    if (typeof item !== "string") continue;

    const trimmed = item.trim();
    if (trimmed) uniqueValues.add(trimmed);
  }

  return [...uniqueValues];
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}
