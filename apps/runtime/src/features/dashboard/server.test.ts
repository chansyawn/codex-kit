import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { normalizeDashboardRange, readDashboard } from "./server";

describe("dashboard metrics", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty metrics when Codex databases do not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(readDashboard({ codexHome })).resolves.toEqual({
      groups: {
        model: [],
        project: [],
        provider: [],
      },
      summary: {
        activeDays: 0,
        averageTokensPerSession: 0,
        currentStreakDays: 0,
        longestSessionMs: 0,
        longestStreakDays: 0,
        medianTokensPerSession: 0,
        mostUsedReasoningEffort: "unknown",
        p90TokensPerSession: 0,
        peakSessionTokens: 0,
        sessionCount: 0,
        totalTokens: 0,
      },
    });
  });

  it("aggregates session metrics by provider, model, and project", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00+08:00"));
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        cwd: "/workspace/alpha",
        id: "thread-a",
        model: "gpt-5.5",
        modelProvider: "openai",
        reasoningEffort: "medium",
        tokensUsed: 100,
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "thread-b",
        model: "gpt-5.5",
        modelProvider: "openai",
        reasoningEffort: "high",
        tokensUsed: 300,
      }),
      createThread({
        cwd: "/workspace/beta",
        id: "thread-c",
        model: "claude",
        modelProvider: "anthropic",
        reasoningEffort: "medium",
        tokensUsed: 200,
      }),
    ]);

    const dashboard = await readDashboard({ codexHome });

    expect(dashboard.summary).toMatchObject({
      averageTokensPerSession: 200,
      medianTokensPerSession: 200,
      mostUsedReasoningEffort: "medium",
      p90TokensPerSession: 300,
      peakSessionTokens: 300,
      sessionCount: 3,
      totalTokens: 600,
    });
    expect(dashboard.groups.provider).toMatchObject([
      {
        averageTokensPerSession: 200,
        key: "openai",
        p90TokensPerSession: 300,
        peakSessionTokens: 300,
        sessionCount: 2,
        totalTokens: 400,
      },
      {
        key: "anthropic",
        sessionCount: 1,
        totalTokens: 200,
      },
    ]);
    expect(dashboard.groups.model).toMatchObject([
      {
        key: "gpt-5.5",
        sessionCount: 2,
        totalTokens: 400,
      },
      {
        key: "claude",
        sessionCount: 1,
        totalTokens: 200,
      },
    ]);
    expect(dashboard.groups.project).toMatchObject([
      {
        key: "/workspace/alpha",
        label: "alpha",
        sessionCount: 2,
        totalTokens: 400,
      },
      {
        key: "/workspace/beta",
        label: "beta",
        sessionCount: 1,
        totalTokens: 200,
      },
    ]);
  });

  it("uses session timestamps for durations and activity days", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00+08:00"));
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        createdAtMs: Date.parse("2026-06-24T00:00:00+08:00"),
        id: "short",
        tokensUsed: 100,
        updatedAtMs: Date.parse("2026-06-24T02:00:00+08:00"),
      }),
      createThread({
        createdAtMs: Date.parse("2026-06-25T00:00:00+08:00"),
        id: "long",
        tokensUsed: 200,
        updatedAtMs: Date.parse("2026-06-25T05:30:00+08:00"),
      }),
    ]);

    const dashboard = await readDashboard({ codexHome });

    expect(dashboard.summary.longestSessionMs).toBe(19_800_000);
    expect(dashboard.summary.activeDays).toBe(2);
    expect(dashboard.summary.longestStreakDays).toBe(2);
  });

  it("uses the last seven local dates by default", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00+08:00"));
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        id: "start-boundary",
        tokensUsed: 100,
        updatedAtMs: Date.parse("2026-06-24T00:00:00+08:00"),
      }),
      createThread({
        id: "today",
        tokensUsed: 200,
        updatedAtMs: Date.parse("2026-06-30T10:00:00+08:00"),
      }),
      createThread({
        id: "outside",
        tokensUsed: 400,
        updatedAtMs: Date.parse("2026-06-23T23:59:59+08:00"),
      }),
    ]);

    const dashboard = await readDashboard({ codexHome });

    expect(dashboard.summary.sessionCount).toBe(2);
    expect(dashboard.summary.totalTokens).toBe(300);
    expect(dashboard.groups.provider).toMatchObject([
      {
        sessionCount: 2,
        totalTokens: 300,
      },
    ]);
  });

  it("filters dashboard metrics by 30d, 180d, and all ranges", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-30T12:00:00+08:00"));
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        id: "seven-days",
        tokensUsed: 100,
        updatedAtMs: Date.parse("2026-06-30T10:00:00+08:00"),
      }),
      createThread({
        id: "thirty-days",
        tokensUsed: 200,
        updatedAtMs: Date.parse("2026-06-01T00:00:00+08:00"),
      }),
      createThread({
        id: "one-eighty-days",
        tokensUsed: 300,
        updatedAtMs: Date.parse("2026-01-02T00:00:00+08:00"),
      }),
      createThread({
        createdAtMs: null,
        id: "all-only",
        tokensUsed: 400,
        updatedAtMs: null,
      }),
    ]);

    await expect(readDashboard({ codexHome, range: "30d" })).resolves.toMatchObject({
      summary: {
        sessionCount: 2,
        totalTokens: 300,
      },
    });
    await expect(readDashboard({ codexHome, range: "180d" })).resolves.toMatchObject({
      summary: {
        sessionCount: 3,
        totalTokens: 600,
      },
    });
    await expect(readDashboard({ codexHome, range: "all" })).resolves.toMatchObject({
      summary: {
        sessionCount: 4,
        totalTokens: 1000,
      },
    });
  });

  it("falls back to 7d for invalid range values", () => {
    expect(normalizeDashboardRange(undefined)).toBe("7d");
    expect(normalizeDashboardRange("invalid")).toBe("7d");
    expect(normalizeDashboardRange("all")).toBe("all");
  });
});

type TestThread = {
  createdAtMs: number | null;
  cwd: string;
  id: string;
  model: string;
  modelProvider: string;
  reasoningEffort: string;
  tokensUsed: number;
  updatedAtMs: number | null;
};

async function createTempCodexHome(): Promise<string> {
  const codexHome = join(tmpdir(), `codexkit-dashboard-${crypto.randomUUID()}`);

  await mkdir(codexHome, { recursive: true });

  return codexHome;
}

function createThread(overrides: Partial<TestThread>): TestThread {
  return {
    createdAtMs: Date.parse("2026-06-24T09:00:00+08:00"),
    cwd: "/workspace/project",
    id: crypto.randomUUID(),
    model: "gpt-5.5",
    modelProvider: "openai",
    reasoningEffort: "medium",
    tokensUsed: 0,
    updatedAtMs: Date.parse("2026-06-24T10:00:00+08:00"),
    ...overrides,
  };
}

function createStateDatabase(codexHome: string, threads: TestThread[]): void {
  const db = new DatabaseSync(join(codexHome, "state_5.sqlite"));
  try {
    db.exec(`
      CREATE TABLE threads (
        id TEXT PRIMARY KEY,
        model_provider TEXT,
        model TEXT,
        cwd TEXT NOT NULL,
        tokens_used INTEGER NOT NULL,
        created_at_ms INTEGER,
        updated_at_ms INTEGER,
        reasoning_effort TEXT
      )
    `);

    const insertThread = db.prepare(`
      INSERT INTO threads (
        id, model_provider, model, cwd, tokens_used,
        created_at_ms, updated_at_ms, reasoning_effort
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const thread of threads) {
      insertThread.run(
        thread.id,
        thread.modelProvider,
        thread.model,
        thread.cwd,
        thread.tokensUsed,
        thread.createdAtMs,
        thread.updatedAtMs,
        thread.reasoningEffort,
      );
    }
  } finally {
    db.close();
  }
}
