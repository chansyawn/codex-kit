import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import { createRuntimeApi } from "@/server/api";

type RuntimeBindings = {
  vite?: {
    transformIndexHtml: (url: string, html: string) => Promise<string>;
  };
};

export type RuntimeAppOptions = {
  codexHome: string;
  now?: () => Date;
  startedAt?: number;
  staticRoot?: string;
  version: string;
};

const appRoot = fileURLToPath(new URL("../..", import.meta.url));

export function createRuntimeApp(options: RuntimeAppOptions): Hono<{ Bindings: RuntimeBindings }> {
  const startedAt = options.startedAt ?? Date.now();

  const app = new Hono<{ Bindings: RuntimeBindings }>();

  app.route(
    "/api",
    createRuntimeApi({
      codexHome: options.codexHome,
      now: options.now,
      startedAt,
      version: options.version,
    }),
  );

  if (options.staticRoot) {
    const serveStaticAsset = serveStatic<{ Bindings: RuntimeBindings }>({
      root: options.staticRoot,
    });

    app.use("*", async (context, next) => {
      const pathname = new URL(context.req.url).pathname;

      if (pathname.startsWith("/api/") || shouldServeHtml(pathname)) {
        return next();
      }

      return serveStaticAsset(context, next);
    });
  }

  app.get("*", async (context) => {
    const pathname = new URL(context.req.url).pathname;

    if (pathname.startsWith("/api/")) {
      return context.notFound();
    }

    if (!shouldServeHtml(pathname)) {
      return context.notFound();
    }

    const html = await readIndexHtml(options.staticRoot);
    const transformedHtml = context.env?.vite
      ? await context.env.vite.transformIndexHtml(pathname, html)
      : html;

    return context.html(transformedHtml);
  });

  return app;
}

async function readIndexHtml(staticRoot?: string): Promise<string> {
  const root = staticRoot ?? appRoot;

  return readFile(join(root, "index.html"), "utf8");
}

function shouldServeHtml(pathname: string): boolean {
  return extname(pathname) === "";
}
