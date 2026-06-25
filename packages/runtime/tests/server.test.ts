import { describe, expect, it } from "vite-plus/test";

import { createRuntimeApp } from "../src/server.ts";

describe("runtime app", () => {
  it("returns health information", async () => {
    const app = createRuntimeApp({
      codexHome: "/tmp/.codex",
      startedAt: Date.now(),
      version: "0.0.0-test",
    });

    const response = await app.request("/api/health");

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      version: "0.0.0-test",
    });
  });

  it("returns session summaries", async () => {
    const app = createRuntimeApp({
      codexHome: "/tmp/.codex",
      now: () => new Date("2026-06-25T00:00:00.000Z"),
      version: "0.0.0-test",
    });

    const response = await app.request("/api/sessions");

    await expect(response.json()).resolves.toEqual([
      {
        branch: "main",
        cwd: "/path/to/project",
        id: "session_local_demo",
        lastActivityAt: "2026-06-25T00:00:00.000Z",
        source: "codex-app",
        title: "Architecture planning session",
      },
    ]);
  });

  it("returns config overview", async () => {
    const app = createRuntimeApp({
      codexHome: "/tmp/.codex",
      version: "0.0.0-test",
    });

    const response = await app.request("/api/config/overview");

    await expect(response.json()).resolves.toMatchObject({
      sourcePath: "/tmp/.codex/config.toml",
      projects: [
        {
          path: "/path/to/project",
          trustedLevel: "trusted",
        },
      ],
    });
  });
});
