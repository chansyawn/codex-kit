import { Hono } from "hono";

import { listSessions } from "@/features/sessions/server";
import { normalizeRuntimeSettingsPatch } from "@/features/settings/model";
import { createRuntimeSettingsStore } from "@/features/settings/server-store";

export type RuntimeApiOptions = {
  codexHome: string;
  startedAt: number;
  version: string;
};

export function createRuntimeApi(options: RuntimeApiOptions) {
  const settings = createRuntimeSettingsStore(options.codexHome);

  return new Hono()
    .get("/health", (context) =>
      context.json({
        ok: true,
        uptimeMs: Date.now() - options.startedAt,
        version: options.version,
      }),
    )
    .get("/sessions", async (context) =>
      context.json(await listSessions({ codexHome: options.codexHome })),
    )
    .get("/settings", async (context) => context.json(await settings.read()))
    .patch("/settings", async (context) => {
      const rawPatch: unknown = await context.req.json().catch(() => ({}));

      return context.json(await settings.patch(normalizeRuntimeSettingsPatch(rawPatch)));
    });
}

export type RuntimeApi = ReturnType<typeof createRuntimeApi>;
