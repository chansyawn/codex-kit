import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vite-plus/test";

import { listSessions, normalizeSessionListQuery } from "./server";

describe("sessions list", () => {
  it("returns an empty paginated response when the state database does not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(listSessions({ codexHome })).resolves.toMatchObject({
      data: [],
      filters: {
        archived: [
          { count: 0, value: false },
          { count: 0, value: true },
        ],
        projects: [],
        providers: [],
      },
      pageInfo: {
        page: 1,
        perPage: 20,
        total: 0,
        totalPages: 0,
      },
    });
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

  it("filters title case-insensitively without matching preview or cwd", async () => {
    const codexHome = await createTempCodexHome();
    createStateDatabase(codexHome, [
      createThread({ id: "title-match", title: "Build runtime filters" }),
      createThread({ id: "preview-only", preview: "Build runtime filters", title: "Other work" }),
      createThread({ cwd: "/workspace/build-runtime", id: "cwd-only", title: "Different title" }),
    ]);

    const response = await listSessions({ codexHome, query: { title: "BUILD" } });

    expect(response.data.map((session) => session.id)).toEqual(["title-match"]);
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

  it("builds filter counts from title matches while excluding the current facet kind", async () => {
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
    ]);

    const response = await listSessions({
      codexHome,
      query: {
        archived: false,
        project: "/workspace/alpha",
        provider: "openai",
        title: "Build",
      },
    });

    expect(response.data.map((session) => session.id)).toEqual(["alpha-openai"]);
    expect(response.filters.projects).toMatchObject([
      { count: 1, value: "/workspace/alpha" },
      { count: 1, value: "/workspace/beta" },
    ]);
    expect(response.filters.providers).toMatchObject([
      { count: 1, value: "anthropic" },
      { count: 1, value: "openai" },
    ]);
    expect(response.filters.archived).toMatchObject([
      { count: 1, value: false },
      { count: 1, value: true },
    ]);
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

function createThread(overrides: Partial<TestThread>): TestThread {
  return {
    archived: false,
    archivedAt: null,
    createdAtMs: Date.parse("2026-06-24T09:00:00+08:00"),
    cwd: "/workspace/project",
    id: crypto.randomUUID(),
    model: "gpt-5.5",
    modelProvider: "openai",
    preview: "",
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
