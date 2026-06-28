import { Hono } from "hono";

import { createCodexKitCore } from "@/server/core";
import { normalizeRuntimeSettingsPatch } from "@/shared/settings";

export type RuntimeApiOptions = {
  codexHome: string;
  now?: () => Date;
  startedAt: number;
  version: string;
};

export function createRuntimeApi(options: RuntimeApiOptions) {
  const core = createCodexKitCore({
    codexHome: options.codexHome,
    now: options.now,
  });

  return new Hono()
    .get("/health", (context) =>
      context.json({
        ok: true,
        uptimeMs: Date.now() - options.startedAt,
        version: options.version,
      }),
    )
    .get("/sessions", async (context) => context.json(await core.sessions.list()))
    .get("/settings", async (context) => context.json(await core.settings.get()))
    .patch("/settings", async (context) => {
      const rawPatch: unknown = await context.req.json().catch(() => ({}));

      return context.json(await core.settings.patch(normalizeRuntimeSettingsPatch(rawPatch)));
    })
    .get("/config/overview", async (context) => context.json(await core.config.getOverview()));
}

export type RuntimeApi = ReturnType<typeof createRuntimeApi>;
