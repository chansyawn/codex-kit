import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { ThreadReadResponse } from "@codexkit/app-server-protocol/v2";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { createRuntimeApi } from "@/server/api";

import { listSessionFilters, listSessions, normalizeSessionListQuery } from "./server";

const ORIGINAL_CODEX_SQLITE_HOME = process.env.CODEX_SQLITE_HOME;

beforeEach(() => {
  delete process.env.CODEX_SQLITE_HOME;
});

afterEach(() => {
  if (ORIGINAL_CODEX_SQLITE_HOME === undefined) {
    delete process.env.CODEX_SQLITE_HOME;
  } else {
    process.env.CODEX_SQLITE_HOME = ORIGINAL_CODEX_SQLITE_HOME;
  }
});

describe("sessions list", () => {
  it("returns an empty paginated response when the state database does not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(listSessions({ codexHome })).resolves.toMatchObject({
      data: [],
      pageInfo: {
        page: 1,
        perPage: 20,
        total: 0,
        totalPages: 0,
      },
    });
  });

  it("does not include filters in the paginated list response", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [createThread({ id: "thread-a" })]);

    const response = await listSessions({ codexHome });

    expect("filters" in response).toBe(false);
  });

  it("returns the first page with the default page size and stable recency ordering", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(
      codexHome,
      Array.from({ length: 25 }).map((_, index) =>
        createThread({
          id: `thread-${String(index).padStart(2, "0")}`,
          title: `Thread ${index}`,
          updatedAtMs: Date.parse("2026-06-24T10:00:00+08:00") + index,
        }),
      ),
    );

    const response = await listSessions({ codexHome });

    expect(response.data).toHaveLength(20);
    expect(response.data[0]?.id).toBe("thread-24");
    expect(response.data.at(-1)?.id).toBe("thread-05");
    expect(response.pageInfo).toEqual({
      page: 1,
      perPage: 20,
      total: 25,
      totalPages: 2,
    });
  });

  it("filters by title or preview using case-sensitive substring search", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({ id: "title-match", title: "Build runtime filters" }),
      createThread({ id: "preview-only", preview: "Build runtime filters", title: "Other work" }),
      createThread({ cwd: "/workspace/build-runtime", id: "cwd-only", title: "Different title" }),
      createThread({ id: "case-mismatch", title: "BUILD runtime filters" }),
    ]);

    const response = await listSessions({ codexHome, query: { title: "Build" } });

    expect(response.data.map((session) => session.id)).toEqual(["title-match", "preview-only"]);
  });

  it("excludes rows without a preview from list results", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({ id: "listable-session", preview: "Listable session" }),
      createThread({ id: "hidden-empty-preview", preview: "" }),
    ]);

    const response = await listSessions({ codexHome });

    expect(response.data.map((session) => session.id)).toEqual(["listable-session"]);
  });

  it("combines filter categories with AND and repeated project/provider values with OR", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        cwd: "/workspace/alpha",
        id: "alpha-openai",
        modelProvider: "openai",
        title: "Build filters",
      }),
      createThread({
        cwd: "/workspace/beta",
        id: "beta-anthropic",
        modelProvider: "anthropic",
        title: "Build filters",
      }),
      createThread({
        cwd: "/workspace/gamma",
        id: "gamma-openai",
        modelProvider: "openai",
        title: "Build filters",
      }),
      createThread({
        archived: true,
        cwd: "/workspace/alpha",
        id: "archived-alpha",
        modelProvider: "openai",
        title: "Build filters",
      }),
    ]);

    const response = await listSessions({
      codexHome,
      query: {
        archived: "false",
        project: ["/workspace/alpha", "/workspace/beta"],
        provider: ["openai", "anthropic"],
        title: "filters",
      },
    });

    expect(response.data.map((session) => session.id)).toEqual(["beta-anthropic", "alpha-openai"]);
  });

  it("filters sessions by last activity start inclusively and end exclusively", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        id: "before-range",
        updatedAtMs: Date.parse("2026-06-23T23:59:59.999+08:00"),
      }),
      createThread({
        id: "range-start",
        updatedAtMs: Date.parse("2026-06-24T00:00:00.000+08:00"),
      }),
      createThread({
        id: "inside-range",
        updatedAtMs: Date.parse("2026-06-24T12:00:00.000+08:00"),
      }),
      createThread({
        id: "range-end",
        updatedAtMs: Date.parse("2026-06-25T00:00:00.000+08:00"),
      }),
    ]);

    const response = await listSessions({
      codexHome,
      query: {
        lastActivityFrom: new Date(Date.parse("2026-06-24T00:00:00.000+08:00")).toISOString(),
        lastActivityTo: new Date(Date.parse("2026-06-25T00:00:00.000+08:00")).toISOString(),
      },
    });

    expect(response.data.map((session) => session.id)).toEqual(["inside-range", "range-start"]);
  });

  it("combines title, field filters, archive state, and last activity range with AND", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        cwd: "/workspace/alpha",
        id: "matching-session",
        modelProvider: "openai",
        title: "Build filters",
        updatedAtMs: Date.parse("2026-06-24T12:00:00+08:00"),
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "outside-time",
        modelProvider: "openai",
        title: "Build filters",
        updatedAtMs: Date.parse("2026-06-20T12:00:00+08:00"),
      }),
      createThread({
        cwd: "/workspace/beta",
        id: "outside-project",
        modelProvider: "openai",
        title: "Build filters",
        updatedAtMs: Date.parse("2026-06-24T12:00:00+08:00"),
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "outside-provider",
        modelProvider: "anthropic",
        title: "Build filters",
        updatedAtMs: Date.parse("2026-06-24T12:00:00+08:00"),
      }),
      createThread({
        archived: true,
        cwd: "/workspace/alpha",
        id: "outside-archive",
        modelProvider: "openai",
        title: "Build filters",
        updatedAtMs: Date.parse("2026-06-24T12:00:00+08:00"),
      }),
    ]);

    const response = await listSessions({
      codexHome,
      query: {
        archived: false,
        lastActivityFrom: new Date(Date.parse("2026-06-24T00:00:00+08:00")).toISOString(),
        lastActivityTo: new Date(Date.parse("2026-06-25T00:00:00+08:00")).toISOString(),
        project: "/workspace/alpha",
        provider: "openai",
        title: "Build",
      },
    });

    expect(response.data.map((session) => session.id)).toEqual(["matching-session"]);
  });

  it("normalizes invalid pagination values and caps perPage", () => {
    expect(normalizeSessionListQuery({ page: "0", perPage: "500" })).toMatchObject({
      page: 1,
      perPage: 100,
    });
    expect(normalizeSessionListQuery({ page: "3", perPage: "bad" })).toMatchObject({
      page: 3,
      perPage: 20,
    });
  });

  it("ignores invalid last activity range values", () => {
    const query = normalizeSessionListQuery({
      lastActivityFrom: "not-a-date",
      lastActivityTo: "2026-06-25T00:00:00.000+08:00",
    });

    expect(query.lastActivityFrom).toBeUndefined();
    expect(query.lastActivityTo).toBe("2026-06-24T16:00:00.000Z");
    expect(query.page).toBe(1);
    expect(query.perPage).toBe(20);
  });

  it("returns stable empty filters when the state database does not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(listSessionFilters({ codexHome })).resolves.toEqual({
      archived: [
        { count: 0, label: "Active", value: false },
        { count: 0, label: "Archived", value: true },
      ],
      projects: [],
      providers: [],
    });
  });

  it("reads the state database from CODEX_SQLITE_HOME when it is set", async () => {
    const codexHome = await createTempCodexHome();
    const sqliteHome = await createTempCodexHome();
    createStateDatabase(sqliteHome, [createThread({ id: "sqlite-home-session" })]);

    const previousSqliteHome = process.env.CODEX_SQLITE_HOME;
    process.env.CODEX_SQLITE_HOME = sqliteHome;
    try {
      const response = await listSessions({ codexHome });

      expect(response.data.map((session) => session.id)).toEqual(["sqlite-home-session"]);
    } finally {
      if (previousSqliteHome === undefined) {
        delete process.env.CODEX_SQLITE_HOME;
      } else {
        process.env.CODEX_SQLITE_HOME = previousSqliteHome;
      }
    }
  });

  it("builds global filter counts independent of list query filters", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        cwd: "/workspace/alpha",
        id: "alpha-openai",
        modelProvider: "openai",
        title: "Build filters",
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "alpha-anthropic",
        modelProvider: "anthropic",
        title: "Build filters",
      }),
      createThread({
        archived: true,
        cwd: "/workspace/alpha",
        id: "alpha-archived",
        modelProvider: "openai",
        title: "Build filters",
      }),
      createThread({
        cwd: "/workspace/beta",
        id: "beta-openai",
        modelProvider: "openai",
        title: "Build filters",
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "other-title",
        modelProvider: "openai",
        title: "Debug filters",
      }),
      createThread({
        cwd: "/workspace/hidden",
        id: "empty-preview",
        preview: "",
        title: "Hidden filters",
      }),
    ]);

    const listResponse = await listSessions({
      codexHome,
      query: {
        archived: false,
        project: "/workspace/alpha",
        provider: "openai",
        title: "Build",
      },
    });
    const filters = await listSessionFilters({ codexHome });

    expect(listResponse.data.map((session) => session.id)).toEqual(["alpha-openai"]);
    expect(filters.projects).toMatchObject([
      { count: 4, label: "alpha", value: "/workspace/alpha" },
      { count: 1, value: "/workspace/beta" },
    ]);
    expect(filters.providers).toMatchObject([
      { count: 4, value: "openai" },
      { count: 1, value: "anthropic" },
    ]);
    expect(filters.archived).toMatchObject([
      { count: 4, value: false },
      { count: 1, value: true },
    ]);
  });

  it("scopes filter counts to the last activity range", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({
        cwd: "/workspace/alpha",
        id: "alpha-in-range",
        modelProvider: "openai",
        updatedAtMs: Date.parse("2026-06-24T12:00:00+08:00"),
      }),
      createThread({
        archived: true,
        cwd: "/workspace/beta",
        id: "beta-in-range",
        modelProvider: "anthropic",
        updatedAtMs: Date.parse("2026-06-24T13:00:00+08:00"),
      }),
      createThread({
        cwd: "/workspace/alpha",
        id: "alpha-outside-range",
        modelProvider: "openai",
        updatedAtMs: Date.parse("2026-06-20T12:00:00+08:00"),
      }),
      createThread({
        cwd: "/workspace/hidden",
        id: "empty-preview-in-range",
        preview: "",
        updatedAtMs: Date.parse("2026-06-24T14:00:00+08:00"),
      }),
    ]);

    const filters = await listSessionFilters({
      codexHome,
      query: {
        lastActivityFrom: new Date(Date.parse("2026-06-24T00:00:00+08:00")).toISOString(),
        lastActivityTo: new Date(Date.parse("2026-06-25T00:00:00+08:00")).toISOString(),
      },
    });

    expect(filters.projects).toMatchObject([
      { count: 1, label: "alpha", value: "/workspace/alpha" },
      { count: 1, label: "beta", value: "/workspace/beta" },
    ]);
    expect(filters.providers).toMatchObject([
      { count: 1, value: "anthropic" },
      { count: 1, value: "openai" },
    ]);
    expect(filters.archived).toMatchObject([
      { count: 1, value: false },
      { count: 1, value: true },
    ]);
  });

  it("sorts project and provider filters by count then label", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({ cwd: "/workspace/beta", id: "beta-1", modelProvider: "openai" }),
      createThread({ cwd: "/workspace/alpha", id: "alpha-1", modelProvider: "anthropic" }),
      createThread({ cwd: "/workspace/alpha", id: "alpha-2", modelProvider: "zed" }),
      createThread({ cwd: "/workspace/gamma", id: "gamma-1", modelProvider: "anthropic" }),
    ]);

    const filters = await listSessionFilters({ codexHome });

    expect(filters.projects.map((filter) => filter.label)).toEqual(["alpha", "beta", "gamma"]);
    expect(filters.providers.map((filter) => filter.value)).toEqual(["anthropic", "openai", "zed"]);
  });
});

describe("session detail API", () => {
  it("returns session detail from the injected reader", async () => {
    const calls: Array<{ codexHome: string; sessionId: string; version: string }> = [];
    const detail = createSessionDetailResponse();
    const app = createRuntimeApi({
      codexHome: "/tmp/codex-home",
      sessionDetailReader: async (options) => {
        calls.push(options);

        return detail;
      },
      startedAt: 0,
      version: "test-version",
    });

    const response = await app.request("/sessions/thread-a");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(detail);
    expect(calls).toEqual([
      {
        codexHome: "/tmp/codex-home",
        sessionId: "thread-a",
        version: "test-version",
      },
    ]);
  });

  it("returns a server error when the injected reader fails", async () => {
    const app = createRuntimeApi({
      codexHome: "/tmp/codex-home",
      sessionDetailReader: async () => {
        throw new Error("app-server failed");
      },
      startedAt: 0,
      version: "test-version",
    });

    const response = await app.request("/sessions/thread-a");
    const body = (await response.json()) as { error: string; ok: false };

    expect(response.status).toBe(500);
    expect(body.ok).toBe(false);
    expect(body.error).toContain("app-server failed");
  });
});

type TestThread = {
  archived: boolean;
  archivedAt: number | null;
  createdAtMs: number | null;
  cwd: string;
  id: string;
  model: string | null;
  modelProvider: string;
  preview: string;
  rolloutPath: string;
  source: string;
  title: string;
  tokensUsed: number;
  updatedAtMs: number | null;
};

async function createTempCodexHome(): Promise<string> {
  const codexHome = join(tmpdir(), `codexkit-sessions-${crypto.randomUUID()}`);

  await mkdir(codexHome, { recursive: true });

  return codexHome;
}

function createSessionDetailResponse(): ThreadReadResponse {
  return {
    thread: {
      agentNickname: null,
      agentRole: null,
      cliVersion: "0.142.5",
      createdAt: 1_783_000_000,
      cwd: "/workspace/project",
      ephemeral: false,
      forkedFromId: null,
      gitInfo: null,
      id: "thread-a",
      modelProvider: "openai",
      name: "Thread detail",
      parentThreadId: null,
      path: "/tmp/rollout.jsonl",
      preview: "Thread detail",
      recencyAt: 1_783_000_100,
      sessionId: "thread-a",
      source: "appServer",
      status: { type: "idle" },
      threadSource: null,
      turns: [],
      updatedAt: 1_783_000_100,
    },
  };
}

function createThread(overrides: Partial<TestThread>): TestThread {
  return {
    archived: false,
    archivedAt: null,
    createdAtMs: Date.parse("2026-06-24T09:00:00+08:00"),
    cwd: "/workspace/project",
    id: crypto.randomUUID(),
    model: "gpt-5.5",
    modelProvider: "openai",
    preview: "Session preview",
    rolloutPath: "/tmp/rollout.jsonl",
    source: "codex",
    title: "Session",
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
        title TEXT NOT NULL,
        cwd TEXT NOT NULL,
        source TEXT NOT NULL,
        model TEXT,
        model_provider TEXT NOT NULL,
        created_at_ms INTEGER,
        updated_at_ms INTEGER,
        archived INTEGER NOT NULL,
        archived_at INTEGER,
        tokens_used INTEGER NOT NULL,
        preview TEXT NOT NULL,
        git_branch TEXT,
        rollout_path TEXT NOT NULL
      )
    `);

    const insertThread = db.prepare(`
      INSERT INTO threads (
        id, title, cwd, source, model, model_provider,
        created_at_ms, updated_at_ms, archived, archived_at,
        tokens_used, preview, git_branch, rollout_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const thread of threads) {
      insertThread.run(
        thread.id,
        thread.title,
        thread.cwd,
        thread.source,
        thread.model,
        thread.modelProvider,
        thread.createdAtMs,
        thread.updatedAtMs,
        thread.archived ? 1 : 0,
        thread.archivedAt,
        thread.tokensUsed,
        thread.preview,
        null,
        thread.rolloutPath,
      );
    }
  } finally {
    db.close();
  }
}
