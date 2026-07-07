import { Hono } from "hono";

import { normalizeCodexConfigPatch } from "@/features/config/model";
import { createCodexConfigStore, CodexConfigParseError } from "@/features/config/server";
import { normalizeDashboardRange, readDashboard } from "@/features/dashboard/server";
import {
  listSessionFilters,
  listSessions,
  readSessionDetail,
  type SessionDetailReader,
} from "@/features/sessions/server";
import { normalizeRuntimeSettingsPatch } from "@/features/settings/model";
import { createRuntimeSettingsStore } from "@/features/settings/server-store";
import {
  type DeeplinkOpener,
  normalizeCodexDeeplinkHref,
  openSystemDeeplink,
} from "@/server/deeplinks";

export type RuntimeApiOptions = {
  codexHome: string;
  openDeeplink?: DeeplinkOpener;
  sessionDetailReader?: SessionDetailReader;
  startedAt: number;
  version: string;
};

export function createRuntimeApi(options: RuntimeApiOptions) {
  const config = createCodexConfigStore(options.codexHome);
  const settings = createRuntimeSettingsStore(options.codexHome);
  const openDeeplink = options.openDeeplink ?? openSystemDeeplink;

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
      context.json(
        await listSessionFilters({
          codexHome: options.codexHome,
          query: {
            lastActivityFrom: context.req.query("lastActivityFrom"),
            lastActivityTo: context.req.query("lastActivityTo"),
          },
        }),
      ),
    )
    .get("/sessions/:sessionId", async (context) => {
      try {
        return context.json(
          await readSessionDetail({
            codexHome: options.codexHome,
            reader: options.sessionDetailReader,
            sessionId: context.req.param("sessionId"),
            version: options.version,
          }),
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load session detail.";

        return context.json({ error: message, ok: false }, 500);
      }
    })
    .get("/sessions", async (context) =>
      context.json(
        await listSessions({
          codexHome: options.codexHome,
          query: {
            archived: context.req.query("archived"),
            lastActivityFrom: context.req.query("lastActivityFrom"),
            lastActivityTo: context.req.query("lastActivityTo"),
            page: context.req.query("page"),
            perPage: context.req.query("perPage"),
            project: context.req.queries("project"),
            provider: context.req.queries("provider"),
            title: context.req.query("title"),
          },
        }),
      ),
    )
    .post("/deeplinks/open", async (context) => {
      const rawBody: unknown = await context.req.json().catch(() => ({}));
      const href = normalizeCodexDeeplinkHref(
        typeof rawBody === "object" && rawBody ? (rawBody as { href?: unknown }).href : undefined,
      );

      if (!href) {
        return context.json({ error: "Invalid deeplink href", ok: false }, 400);
      }

      try {
        await openDeeplink(href);

        return context.json({ ok: true }, 202);
      } catch {
        return context.json({ error: "Failed to open deeplink", ok: false }, 500);
      }
    })
    .get("/config", async (context) => context.json(await config.read()))
    .patch("/config", async (context) => {
      const rawPatch: unknown = await context.req.json().catch(() => ({}));

      try {
        return context.json(await config.patch(normalizeCodexConfigPatch(rawPatch)));
      } catch (error) {
        if (error instanceof CodexConfigParseError) {
          return context.json({ error: error.message, ok: false }, 409);
        }

        return context.json({ error: "Failed to write config.toml", ok: false }, 500);
      }
    })
    .get("/settings", async (context) => context.json(await settings.read()))
    .patch("/settings", async (context) => {
      const rawPatch: unknown = await context.req.json().catch(() => ({}));

      return context.json(await settings.patch(normalizeRuntimeSettingsPatch(rawPatch)));
    });
}

export type RuntimeApi = ReturnType<typeof createRuntimeApi>;
