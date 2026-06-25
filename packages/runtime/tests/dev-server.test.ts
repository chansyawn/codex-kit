import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { createRuntimeDevServer, type RuntimeDevServer } from "../src/dev-server.ts";

let devServer: RuntimeDevServer | null = null;

describe("runtime dev server", () => {
  afterEach(async () => {
    await devServer?.close();
    devServer = null;
  });

  it("serves runtime API and Vite HTML from one origin", async () => {
    devServer = await createRuntimeDevServer({
      codexHome: "/tmp/.codex",
      host: "127.0.0.1",
      port: 0,
      version: "0.0.0-test",
      webRoot: fileURLToPath(new URL("../../../apps/website", import.meta.url)),
    });

    const healthResponse = await fetch(`${devServer.url}/api/health`);
    const pageResponse = await fetch(devServer.url);
    const appModuleResponse = await fetch(`${devServer.url}/src/app/app.tsx`);
    const appModule = await appModuleResponse.text();

    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      version: "0.0.0-test",
    });
    await expect(pageResponse.text()).resolves.toContain('<div id="app"></div>');
    expect(appModule).toContain("/node_modules/.vite/deps/@tanstack_react-router.js");
    expect(appModule).not.toContain("/@fs/");
  });
});
