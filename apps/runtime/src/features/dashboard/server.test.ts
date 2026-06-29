import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it, vi } from "vite-plus/test";

import { readDashboard } from "./server";

describe("dashboard metrics", () => {
  it("returns empty metrics when Codex databases do not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(readDashboard({ codexHome })).resolves.toEqual({
      activity: [],
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
      trend: [],
    });
  });

  it("aggregates session metrics by provider, model, and project", async () => {
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
    createLogsDatabase(codexHome, []);

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
    createLogsDatabase(codexHome, []);

    const dashboard = await readDashboard({ codexHome });

    expect(dashboard.summary.longestSessionMs).toBe(19_800_000);
    expect(dashboard.summary.activeDays).toBe(2);
    expect(dashboard.summary.longestStreakDays).toBe(2);
  });

  it("builds token trend and activity from joined token usage logs", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        id: "thread-a",
        tokensUsed: 100,
      }),
    ]);
    createLogsDatabase(codexHome, [
      createTokenLog({
        threadId: "thread-a",
        tokens: 10,
        ts: Date.parse("2026-06-24T10:00:00+08:00") / 1000,
      }),
      createTokenLog({
        threadId: "missing-thread",
        tokens: 40,
        ts: Date.parse("2026-06-25T10:00:00+08:00") / 1000,
      }),
    ]);

    const dashboard = await readDashboard({ codexHome });

    expect(dashboard.trend).toEqual([
      {
        date: "2026-06-24",
        sessions: 1,
        tokens: 10,
      },
      {
        date: "2026-06-25",
        sessions: 0,
        tokens: 40,
      },
    ]);
    expect(dashboard.activity.slice(0, 2)).toEqual([
      {
        count: 10,
        date: "2026-06-24",
        level: 1,
      },
      {
        count: 40,
        date: "2026-06-25",
        level: 4,
      },
    ]);
  });

  it("fills inactive dates in the activity calendar range", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-26T12:00:00+08:00"));
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        createdAtMs: Date.parse("2026-06-24T10:00:00+08:00"),
        id: "thread-a",
        tokensUsed: 100,
        updatedAtMs: Date.parse("2026-06-24T10:00:00+08:00"),
      }),
    ]);
    createLogsDatabase(codexHome, [
      createTokenLog({
        threadId: "thread-a",
        tokens: 20,
        ts: Date.parse("2026-06-24T10:00:00+08:00") / 1000,
      }),
    ]);

    try {
      const dashboard = await readDashboard({ codexHome });

      expect(dashboard.activity).toEqual([
        {
          count: 20,
          date: "2026-06-24",
          level: 4,
        },
        {
          count: 0,
          date: "2026-06-25",
          level: 0,
        },
        {
          count: 0,
          date: "2026-06-26",
          level: 0,
        },
      ]);
    } finally {
      vi.useRealTimers();
    }
  });
});

type TestThread = {
  createdAtMs: number;
  cwd: string;
  id: string;
  model: string;
  modelProvider: string;
  reasoningEffort: string;
  tokensUsed: number;
  updatedAtMs: number;
};

type TestTokenLog = {
  body: string;
  threadId: string | null;
  ts: number;
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

function createTokenLog({
  threadId,
  tokens,
  ts,
}: {
  threadId: string | null;
  tokens: number;
  ts: number;
}): TestTokenLog {
  return {
    body: `post sampling token usage turn_id=test total_usage_tokens=${tokens} estimated_token_count=Some(1)`,
    threadId,
    ts,
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

function createLogsDatabase(codexHome: string, logs: TestTokenLog[]): void {
  const db = new DatabaseSync(join(codexHome, "logs_2.sqlite"));
  try {
    db.exec(`
      CREATE TABLE logs (
        thread_id TEXT,
        ts INTEGER NOT NULL,
        feedback_log_body TEXT
      )
    `);

    const insertLog = db.prepare(`
      INSERT INTO logs (thread_id, ts, feedback_log_body)
      VALUES (?, ?, ?)
    `);

    for (const log of logs) {
      insertLog.run(log.threadId, log.ts, log.body);
    }
  } finally {
    db.close();
  }
}
