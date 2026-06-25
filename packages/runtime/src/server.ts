import { createCodexKitCore } from "@codexkit/core";
import type { HealthResponse } from "@codexkit/shared";
import { Hono } from "hono";

export type RuntimeAppOptions = {
  codexHome: string;
  now?: () => Date;
  startedAt?: number;
  version: string;
};

export function createRuntimeApp(options: RuntimeAppOptions): Hono {
  const core = createCodexKitCore({
    codexHome: options.codexHome,
    now: options.now,
  });
  const startedAt = options.startedAt ?? Date.now();

  const app = new Hono();

  app.get("/api/health", (context) => {
    const response: HealthResponse = {
      ok: true,
      uptimeMs: Date.now() - startedAt,
      version: options.version,
    };

    return context.json(response);
  });

  app.get("/api/sessions", async (context) => context.json(await core.sessions.list()));

  app.get("/api/config/overview", async (context) => context.json(await core.config.getOverview()));

  return app;
}
