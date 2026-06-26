import { readFile } from "node:fs/promises";
import { extname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { Hono } from "hono";

import { createCodexKitCore } from "@/core";
import type { HealthResponse } from "@/shared/api";

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
  const core = createCodexKitCore({
    codexHome: options.codexHome,
    now: options.now,
  });
  const startedAt = options.startedAt ?? Date.now();

  const app = new Hono<{ Bindings: RuntimeBindings }>();

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

  app.get("*", async (context) => {
    const pathname = new URL(context.req.url).pathname;

    if (pathname.startsWith("/api/")) {
      return context.notFound();
    }

    if (options.staticRoot) {
      const staticResponse = await readStaticAsset(options.staticRoot, pathname);

      if (staticResponse) {
        return staticResponse;
      }
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

async function readStaticAsset(staticRoot: string, pathname: string): Promise<Response | null> {
  const filePath = resolveStaticPath(staticRoot, pathname);

  if (!filePath || shouldServeHtml(pathname)) {
    return null;
  }

  try {
    const body = await readFile(filePath);

    return new Response(body, {
      headers: {
        "Content-Type": getContentType(filePath),
      },
    });
  } catch {
    return null;
  }
}

async function readIndexHtml(staticRoot?: string): Promise<string> {
  const root = staticRoot ?? appRoot;

  return readFile(join(root, "index.html"), "utf8");
}

function resolveStaticPath(staticRoot: string, pathname: string): string | null {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = resolve(staticRoot, `.${normalizedPath}`);
  const relativePath = relative(staticRoot, filePath);

  if (relativePath.startsWith("..") || relativePath.includes(`..${sep}`)) {
    return null;
  }

  return filePath;
}

function shouldServeHtml(pathname: string): boolean {
  return extname(pathname) === "";
}

function getContentType(filePath: string): string {
  switch (extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
