// @vitest-environment node
import { fileURLToPath } from "node:url";

import type { ViteDevServer } from "vite-plus";
import { createServer } from "vite-plus";
import { afterEach, describe, expect, it } from "vite-plus/test";

let devServer: ViteDevServer | null = null;

describe("codexkit vite dev server", () => {
  afterEach(async () => {
    closeOpenConnections(devServer);
    await closeDevServer(devServer);
    devServer = null;
  });

  it("serves runtime API and Vite client modules from one origin", async () => {
    const appRoot = fileURLToPath(new URL("../..", import.meta.url));
    devServer = await createServer({
      configFile: fileURLToPath(new URL("../../vite.config.ts", import.meta.url)),
      root: appRoot,
      server: {
        host: "127.0.0.1",
        port: 0,
      },
    });

    await devServer.listen();

    const url = devServer.resolvedUrls?.local[0];

    if (!url) {
      throw new Error("Vite dev server did not expose a local URL.");
    }

    const healthResponse = await fetch(`${url}api/health`);
    const pageResponse = await fetch(url);
    const appModuleResponse = await fetch(`${url}src/app/app.tsx`);
    const localeModuleResponse = await fetch(`${url}src/locales/en/messages.po?import`);
    const appModule = await appModuleResponse.text();

    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      version: "0.0.0",
    });
    const pageHtml = await pageResponse.text();

    expect(pageHtml).toContain('<div id="app"></div>');
    expect(pageHtml).toContain("/@react-refresh");
    expect(pageHtml).toContain("window.$RefreshReg$");
    expect(appModule).toContain("@tanstack_react-router");
    expect(appModule).not.toContain("/@fs/");
    expect(localeModuleResponse.ok).toBe(true);
    expect(localeModuleResponse.headers.get("content-type")).toContain("text/javascript");
  });
});

async function closeDevServer(server: ViteDevServer | null): Promise<void> {
  if (!server) {
    return;
  }

  await Promise.race([
    server.close(),
    new Promise<void>((resolve) => {
      setTimeout(resolve, 1_000);
    }),
  ]);
}

function closeOpenConnections(server: ViteDevServer | null): void {
  const httpServer = server?.httpServer;

  if (httpServer && "closeAllConnections" in httpServer) {
    httpServer.closeAllConnections();
  }
}
