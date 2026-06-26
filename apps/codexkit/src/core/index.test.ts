import { describe, expect, it } from "vite-plus/test";

import { createCodexKitCore } from "./index.ts";

describe("createCodexKitCore", () => {
  it("returns session summaries through the sessions module", async () => {
    const core = createCodexKitCore({
      codexHome: "/tmp/.codex",
      now: () => new Date("2026-06-25T00:00:00.000Z"),
    });

    await expect(core.sessions.list()).resolves.toEqual([
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

  it("returns a config overview through the config module", async () => {
    const core = createCodexKitCore({ codexHome: "/tmp/.codex" });

    await expect(core.config.getOverview()).resolves.toMatchObject({
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
