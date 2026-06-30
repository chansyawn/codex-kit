import { existsSync } from "node:fs";
import { basename } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type {
  DashboardGroupBy,
  DashboardGroupMetric,
  DashboardRange,
  DashboardResponse,
  DashboardSummary,
} from "./model";

export type ReadDashboardOptions = {
  codexHome: string;
  range?: DashboardRange;
};

type ThreadRow = {
  created_at_ms: number | null;
  cwd: string;
  id: string;
  model: string | null;
  model_provider: string | null;
  reasoning_effort: string | null;
  tokens_used: number;
  updated_at_ms: number | null;
};

type DashboardThread = {
  activeDays: Set<string>;
  createdAtMs: number | null;
  cwd: string;
  id: string;
  model: string;
  modelProvider: string;
  projectKey: string;
  projectLabel: string;
  reasoningEffort: string;
  tokensUsed: number;
  updatedAtMs: number | null;
};

type GroupBucket = {
  activeDays: Set<string>;
  key: string;
  label: string;
  longestSessionMs: number;
  tokens: number[];
  totalTokens: number;
};

const UNKNOWN = "unknown";
const PROJECTLESS = "Projectless";
const DAY_IN_MS = 86_400_000;
const TIME_ZONE = "Asia/Shanghai";
const DEFAULT_RANGE: DashboardRange = "7d";
const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "180d": 180,
} as const satisfies Record<Exclude<DashboardRange, "all">, number>;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: TIME_ZONE,
  year: "numeric",
});

const EMPTY_SUMMARY: DashboardSummary = {
  activeDays: 0,
  averageTokensPerSession: 0,
  currentStreakDays: 0,
  longestSessionMs: 0,
  longestStreakDays: 0,
  medianTokensPerSession: 0,
  mostUsedReasoningEffort: UNKNOWN,
  p90TokensPerSession: 0,
  peakSessionTokens: 0,
  sessionCount: 0,
  totalTokens: 0,
};

export async function readDashboard(options: ReadDashboardOptions): Promise<DashboardResponse> {
  const threads = readThreads(`${options.codexHome}/state_5.sqlite`);

  return createDashboardResponse({
    range: options.range ?? DEFAULT_RANGE,
    threads,
  });
}

export function normalizeDashboardRange(value: unknown): DashboardRange {
  if (value === "7d" || value === "30d" || value === "180d" || value === "all") {
    return value;
  }

  return DEFAULT_RANGE;
}

export function createDashboardResponse({
  range = DEFAULT_RANGE,
  threads,
}: {
  range?: DashboardRange;
  threads: DashboardThread[];
}): DashboardResponse {
  const scopedThreads = filterThreadsByRange(threads, range);
  const activeDays = new Set<string>();

  for (const thread of scopedThreads) {
    for (const activeDay of thread.activeDays) {
      activeDays.add(activeDay);
    }
  }

  return {
    groups: {
      model: createGroupMetrics(scopedThreads, "model"),
      project: createGroupMetrics(scopedThreads, "project"),
      provider: createGroupMetrics(scopedThreads, "provider"),
    },
    summary: createSummary(scopedThreads, activeDays),
  };
}

function readThreads(dbPath: string): DashboardThread[] {
  if (!existsSync(dbPath)) return [];

  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const rows = db
      .prepare(
        `SELECT id, model_provider, model, cwd, tokens_used,
                created_at_ms, updated_at_ms, reasoning_effort
         FROM threads`,
      )
      .all() as ThreadRow[];

    return rows.map(mapThreadRow);
  } catch {
    return [];
  } finally {
    db.close();
  }
}

function mapThreadRow(row: ThreadRow): DashboardThread {
  const cwd = row.cwd.trim();
  const activeDays = new Set<string>();

  addTimestampDay(activeDays, row.created_at_ms);
  addTimestampDay(activeDays, row.updated_at_ms);

  return {
    activeDays,
    createdAtMs: row.created_at_ms,
    cwd,
    id: row.id,
    model: normalizeDimension(row.model),
    modelProvider: normalizeDimension(row.model_provider),
    projectKey: cwd || PROJECTLESS,
    projectLabel: cwd ? basename(cwd) : PROJECTLESS,
    reasoningEffort: normalizeDimension(row.reasoning_effort),
    tokensUsed: Math.max(0, row.tokens_used),
    updatedAtMs: row.updated_at_ms,
  };
}

function createSummary(threads: DashboardThread[], activeDays: Set<string>): DashboardSummary {
  if (threads.length === 0) return EMPTY_SUMMARY;

  const tokens = threads.map((thread) => thread.tokensUsed);
  const durations = threads.map(getThreadDurationMs);
  const reasoningCounts = new Map<string, number>();
  for (const thread of threads) {
    reasoningCounts.set(
      thread.reasoningEffort,
      (reasoningCounts.get(thread.reasoningEffort) ?? 0) + 1,
    );
  }
  const streaks = calculateStreaks(activeDays);
  const totalTokens = sum(tokens);

  return {
    activeDays: activeDays.size,
    averageTokensPerSession: Math.round(totalTokens / threads.length),
    currentStreakDays: streaks.current,
    longestSessionMs: Math.max(0, ...durations),
    longestStreakDays: streaks.longest,
    medianTokensPerSession: percentile(tokens, 0.5),
    mostUsedReasoningEffort: getTopKey(reasoningCounts),
    p90TokensPerSession: percentile(tokens, 0.9),
    peakSessionTokens: Math.max(0, ...tokens),
    sessionCount: threads.length,
    totalTokens,
  };
}

function createGroupMetrics(
  threads: DashboardThread[],
  groupBy: DashboardGroupBy,
): DashboardGroupMetric[] {
  const buckets = new Map<string, GroupBucket>();

  for (const thread of threads) {
    const { key, label } = getThreadGroup(thread, groupBy);
    const bucket = getGroupBucket(buckets, key, label);

    bucket.totalTokens += thread.tokensUsed;
    bucket.tokens.push(thread.tokensUsed);
    bucket.longestSessionMs = Math.max(bucket.longestSessionMs, getThreadDurationMs(thread));
    for (const activeDay of thread.activeDays) {
      bucket.activeDays.add(activeDay);
    }
  }

  return [...buckets.values()]
    .map((bucket) => ({
      activeDays: bucket.activeDays.size,
      averageTokensPerSession:
        bucket.tokens.length === 0 ? 0 : Math.round(bucket.totalTokens / bucket.tokens.length),
      key: bucket.key,
      label: bucket.label,
      longestSessionMs: bucket.longestSessionMs,
      p90TokensPerSession: percentile(bucket.tokens, 0.9),
      peakSessionTokens: Math.max(0, ...bucket.tokens),
      sessionCount: bucket.tokens.length,
      totalTokens: bucket.totalTokens,
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens || b.sessionCount - a.sessionCount);
}

function getThreadGroup(
  thread: DashboardThread,
  groupBy: DashboardGroupBy,
): { key: string; label: string } {
  if (groupBy === "provider") return { key: thread.modelProvider, label: thread.modelProvider };
  if (groupBy === "model") return { key: thread.model, label: thread.model };

  return { key: thread.projectKey, label: thread.projectLabel };
}

function getGroupBucket(
  buckets: Map<string, GroupBucket>,
  key: string,
  label: string,
): GroupBucket {
  const existingBucket = buckets.get(key);
  if (existingBucket) return existingBucket;

  const bucket: GroupBucket = {
    activeDays: new Set(),
    key,
    label,
    longestSessionMs: 0,
    tokens: [],
    totalTokens: 0,
  };
  buckets.set(key, bucket);

  return bucket;
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;

  const sortedValues = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentileValue * sortedValues.length) - 1;

  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))] ?? 0;
}

function calculateStreaks(days: Set<string>): { current: number; longest: number } {
  if (days.size === 0) return { current: 0, longest: 0 };

  let currentRun = 0;
  let longest = 0;
  let previousDay: string | null = null;

  for (const day of [...days].sort()) {
    currentRun = previousDay && addDays(previousDay, 1) === day ? currentRun + 1 : 1;
    longest = Math.max(longest, currentRun);
    previousDay = day;
  }

  let current = 0;
  let cursor = days.has(toDay(Date.now())) ? toDay(Date.now()) : addDays(toDay(Date.now()), -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}

function getTopKey(counts: Map<string, number>): string {
  return (
    [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? UNKNOWN
  );
}

function getThreadDurationMs(thread: DashboardThread): number {
  if (thread.createdAtMs === null || thread.updatedAtMs === null) return 0;

  return Math.max(0, thread.updatedAtMs - thread.createdAtMs);
}

function addTimestampDay(days: Set<string>, timestampMs: number | null): void {
  if (timestampMs === null || timestampMs <= 0) return;

  days.add(toDay(timestampMs));
}

function toDay(timestampMs: number): string {
  return dateFormatter.format(new Date(timestampMs));
}

function addDays(day: string, delta: number): string {
  const date = new Date(`${day}T00:00:00+08:00`);
  date.setTime(date.getTime() + delta * DAY_IN_MS);

  return toDay(date.getTime());
}

function normalizeDimension(value: string | null): string {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : UNKNOWN;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function filterThreadsByRange(
  threads: DashboardThread[],
  range: DashboardRange,
): DashboardThread[] {
  if (range === "all") return threads;

  const window = getRangeWindow(range);

  return threads.flatMap((thread) => {
    const activeAtMs = getThreadActiveAtMs(thread);
    if (activeAtMs === null || activeAtMs < window.startMs || activeAtMs > window.endMs) {
      return [];
    }

    return [
      {
        ...thread,
        activeDays: new Set(
          [...thread.activeDays].filter((day) => day >= window.startDay && day <= window.endDay),
        ),
      },
    ];
  });
}

function getRangeWindow(range: Exclude<DashboardRange, "all">): {
  endDay: string;
  endMs: number;
  startDay: string;
  startMs: number;
} {
  const endMs = Date.now();
  const endDay = toDay(endMs);
  const startDay = addDays(endDay, -(RANGE_DAYS[range] - 1));

  return {
    endDay,
    endMs,
    startDay,
    startMs: Date.parse(`${startDay}T00:00:00+08:00`),
  };
}

function getThreadActiveAtMs(thread: DashboardThread): number | null {
  return thread.updatedAtMs ?? thread.createdAtMs;
}
