// @vitest-environment node
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { createRuntimeApp } from "./app.ts";

let staticRoot: string | null = null;

describe("runtime app", () => {
  afterEach(async () => {
    if (staticRoot) {
      await rm(staticRoot, { force: true, recursive: true });
      staticRoot = null;
    }
  });

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

  it("serves production assets and only falls back for HTML navigation routes", async () => {
    staticRoot = await mkdtemp(join(tmpdir(), "codexkit-static-"));
    await writeFile(join(staticRoot, "index.html"), '<div id="app"></div>');
    await writeFile(join(staticRoot, "client.js"), "console.log('client');");

    const app = createRuntimeApp({
      codexHome: "/tmp/.codex",
      staticRoot,
      version: "0.0.0-test",
    });

    const assetResponse = await app.request("/client.js");
    const routeResponse = await app.request("/sessions");
    const missingAssetResponse = await app.request("/missing.js");
    const missingApiResponse = await app.request("/api/missing");

    await expect(assetResponse.text()).resolves.toBe("console.log('client');");
    await expect(routeResponse.text()).resolves.toContain('<div id="app"></div>');
    expect(missingAssetResponse.status).toBe(404);
    expect(missingApiResponse.status).toBe(404);
  });
});
