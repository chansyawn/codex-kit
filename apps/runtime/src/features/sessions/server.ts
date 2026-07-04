import { existsSync } from "node:fs";
import { basename } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  SessionFilterOption,
  SessionListQuery,
  SessionListQueryInput,
  SessionsFiltersResponse,
  SessionsResponse,
  SessionSummary,
} from "./model";

export type ListSessionsOptions = {
  codexHome: string;
  query?: SessionListQueryInput;
};

export type ListSessionFiltersOptions = {
  codexHome: string;
  query?: Pick<SessionListQueryInput, "lastActivityFrom" | "lastActivityTo">;
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

type SessionFilterRow = {
  archived: number;
  cwd: string;
  model_provider: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
const EMPTY_FILTERS: SessionsFiltersResponse = {
  archived: [
    { count: 0, label: "Active", value: false },
    { count: 0, label: "Archived", value: true },
  ],
  projects: [],
  providers: [],
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

export function normalizeSessionListQuery(input: SessionListQueryInput = {}): SessionListQuery {
  return {
    archived: normalizeArchived(input.archived),
    lastActivityFrom: normalizeIsoDateTimeString(input.lastActivityFrom),
    lastActivityTo: normalizeIsoDateTimeString(input.lastActivityTo),
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
    const rows = readSessionRows(db, query).map(mapRow);

    return createSessionsResponse(rows, query);
  } catch {
    return createSessionsResponse([], query);
  } finally {
    db.close();
  }
}

export async function listSessionFilters(
  options: ListSessionFiltersOptions,
): Promise<SessionsFiltersResponse> {
  const query = normalizeSessionListQuery(options.query);
  const dbPath = `${options.codexHome}/state_5.sqlite`;
  if (!existsSync(dbPath)) return EMPTY_FILTERS;

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = readSessionFilterRows(db, query);

    return createSessionFiltersResponse(rows);
  } catch {
    return EMPTY_FILTERS;
  } finally {
    db.close();
  }
}

function readSessionRows(db: DatabaseSync, query: SessionListQuery): ThreadRow[] {
  const { clauses, params } = createSessionWhereClause(query);

  return db
    .prepare(
      `SELECT id, title, cwd, source, model, model_provider,
              created_at_ms, updated_at_ms, archived, archived_at,
              tokens_used, preview, git_branch, rollout_path
       FROM threads
       WHERE ${clauses.join(" AND ")}
       ORDER BY updated_at_ms DESC, id DESC`,
    )
    .all(...params) as ThreadRow[];
}

function readSessionFilterRows(db: DatabaseSync, query: SessionListQuery): SessionFilterRow[] {
  const { clauses, params } = createTimeRangeWhereClause(query);

  return db
    .prepare(
      `SELECT cwd, model_provider, archived
       FROM threads
       WHERE ${clauses.join(" AND ")}`,
    )
    .all(...params) as SessionFilterRow[];
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
    pageInfo: {
      page,
      perPage: query.perPage,
      total,
      totalPages,
    },
  };
}

function createSessionFiltersResponse(rows: SessionFilterRow[]): SessionsFiltersResponse {
  const archivedCounts = new Map<boolean, number>([
    [false, 0],
    [true, 0],
  ]);
  const projectCounts = new Map<string, number>();
  const providerCounts = new Map<string, number>();

  for (const row of rows) {
    const archived = row.archived === 1;
    archivedCounts.set(archived, (archivedCounts.get(archived) ?? 0) + 1);

    if (row.cwd) projectCounts.set(row.cwd, (projectCounts.get(row.cwd) ?? 0) + 1);
    if (row.model_provider) {
      providerCounts.set(row.model_provider, (providerCounts.get(row.model_provider) ?? 0) + 1);
    }
  }

  return {
    archived: [
      { count: archivedCounts.get(false) ?? 0, label: "Active", value: false },
      { count: archivedCounts.get(true) ?? 0, label: "Archived", value: true },
    ],
    projects: createTextFilters(projectCounts, "project"),
    providers: createTextFilters(providerCounts, "provider"),
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
  counts: Map<string, number>,
  kind: "project" | "provider",
): SessionFilterOption[] {
  return [...counts.entries()]
    .map(([value, count]) => ({
      count,
      label: kind === "project" ? basename(value) || value : value,
      value,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
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

function createSessionWhereClause(query: SessionListQuery): {
  clauses: string[];
  params: Array<number | string>;
} {
  const titlePattern = `%${escapeLikePattern(query.title).toLowerCase()}%`;
  const timeRangeClause = createTimeRangeWhereClause(query);

  return {
    clauses: ["lower(title) LIKE ? ESCAPE '\\'", ...timeRangeClause.clauses],
    params: [titlePattern, ...timeRangeClause.params],
  };
}

function createTimeRangeWhereClause(query: SessionListQuery): {
  clauses: string[];
  params: number[];
} {
  const clauses = ["1 = 1"];
  const params: number[] = [];
  const from = parseIsoDateTime(query.lastActivityFrom);
  const to = parseIsoDateTime(query.lastActivityTo);

  if (from !== undefined) {
    clauses.push("updated_at_ms >= ?");
    params.push(from);
  }

  if (to !== undefined) {
    clauses.push("updated_at_ms < ?");
    params.push(to);
  }

  return { clauses, params };
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

function normalizeIsoDateTimeString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  const timestamp = parseIsoDateTime(trimmed);

  return timestamp === undefined ? undefined : new Date(timestamp).toISOString();
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

function parseIsoDateTime(value: string | undefined): number | undefined {
  if (!value) return undefined;

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : undefined;
}
