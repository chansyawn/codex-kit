import { Hono } from "hono";

import { normalizeDashboardRange, readDashboard } from "@/features/dashboard/server";
import { listSessionFilters, listSessions } from "@/features/sessions/server";
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
    .get("/dashboard", async (context) =>
      context.json(
        await readDashboard({
          codexHome: options.codexHome,
          range: normalizeDashboardRange(context.req.query("range")),
        }),
      ),
    )
    .get("/sessions/filters", async (context) =>
      context.json(await listSessionFilters({ codexHome: options.codexHome })),
    )
    .get("/sessions", async (context) =>
      context.json(
        await listSessions({
          codexHome: options.codexHome,
          query: {
            archived: context.req.query("archived"),
            page: context.req.query("page"),
            perPage: context.req.query("perPage"),
            project: context.req.queries("project"),
            provider: context.req.queries("provider"),
            title: context.req.query("title"),
          },
        }),
      ),
    )
    .get("/settings", async (context) => context.json(await settings.read()))
    .patch("/settings", async (context) => {
      const rawPatch: unknown = await context.req.json().catch(() => ({}));

      return context.json(await settings.patch(normalizeRuntimeSettingsPatch(rawPatch)));
    });
}

export type RuntimeApi = ReturnType<typeof createRuntimeApi>;
