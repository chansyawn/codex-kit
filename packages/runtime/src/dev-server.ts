import { readFile } from "node:fs/promises";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getRequestListener } from "@hono/node-server";
import { createServer as createViteServer, type ViteDevServer } from "vite-plus";

import { createRuntimeApp } from "./server.ts";

export type RuntimeDevServerOptions = {
  codexHome: string;
  host: string;
  port: number;
  version: string;
  webRoot?: string;
};

export type RuntimeDevServer = {
  close: () => Promise<void>;
  server: Server;
  url: string;
  vite: ViteDevServer;
};

export async function createRuntimeDevServer(
  options: RuntimeDevServerOptions,
): Promise<RuntimeDevServer> {
  const apiApp = createRuntimeApp({
    codexHome: options.codexHome,
    version: options.version,
  });
  const apiListener = getRequestListener(apiApp.fetch, {
    hostname: options.host,
  });
  const webRoot = options.webRoot ?? resolveDefaultWebRoot();

  let vite: ViteDevServer;
  const server = createServer(async (request, response) => {
    if (request.url?.startsWith("/api/")) {
      await apiListener(request, response);
      return;
    }

    vite.middlewares(request, response, () => {
      void serveIndexHtml({
        requestUrl: request.url ?? "/",
        response,
        vite,
        webRoot,
      });
    });
  });

  vite = await createViteServer({
    appType: "custom",
    configFile: join(webRoot, "vite.config.ts"),
    root: webRoot,
    server: {
      hmr: {
        server,
      },
      middlewareMode: true,
    },
  });

  await listen(server, options.port, options.host);

  return {
    async close() {
      await vite.close();
      await closeServer(server);
    },
    server,
    url: createDashboardUrlFromAddress(server.address()),
    vite,
  };
}

async function serveIndexHtml({
  requestUrl,
  response,
  vite,
  webRoot,
}: {
  requestUrl: string;
  response: ServerResponse;
  vite: ViteDevServer;
  webRoot: string;
}): Promise<void> {
  if (!shouldServeHtml(requestUrl)) {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  try {
    const template = await readFile(join(webRoot, "index.html"), "utf8");
    const html = await vite.transformIndexHtml(requestUrl, template);

    response.statusCode = 200;
    response.setHeader("Content-Type", "text/html");
    response.end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error as Error);
    response.statusCode = 500;
    response.end((error as Error).message);
  }
}

function shouldServeHtml(requestUrl: string): boolean {
  const pathname = new URL(requestUrl, "http://codexkit.local").pathname;

  return extname(pathname) === "";
}

function resolveDefaultWebRoot(): string {
  return fileURLToPath(new URL("../../../apps/website", import.meta.url));
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function createDashboardUrlFromAddress(
  address: Server["address"] extends () => infer T ? T : never,
) {
  if (!address || typeof address === "string") {
    throw new Error("Runtime dev server did not expose a network address.");
  }

  return createDashboardUrl(address);
}

function createDashboardUrl(address: AddressInfo): string {
  return `http://${address.address}:${address.port}`;
}
