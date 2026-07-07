import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { createRuntimeApi } from "@/server/api";

import {
  CodexConfigParseError,
  createCodexConfigStore,
  getCodexConfigPath,
  patchCodexConfig,
  readCodexConfig,
  updateTopLevelModelProvider,
} from "./server";

describe("codex config storage", () => {
  it("returns openai defaults when config.toml does not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(readCodexConfig(codexHome)).resolves.toMatchObject({
      configPath: getCodexConfigPath(codexHome),
      modelProvider: "openai",
      parseStatus: { ok: true },
      providers: [{ builtIn: true, configured: false, id: "openai", label: "openai" }],
    });
  });

  it("reads current and custom model providers from config.toml", async () => {
    const codexHome = await createTempCodexHome();
    await writeFile(
      getCodexConfigPath(codexHome),
      [
        'model_provider = "proxy"',
        "",
        "[model_providers.proxy]",
        'name = "OpenAI using LLM proxy"',
        'base_url = "http://proxy.example.com"',
        "",
      ].join("\n"),
    );

    const config = await readCodexConfig(codexHome);

    expect(config.modelProvider).toBe("proxy");
    expect(config.providers).toContainEqual({
      builtIn: false,
      configured: true,
      id: "proxy",
      label: "OpenAI using LLM proxy",
    });
  });

  it("reports parse errors without overwriting config.toml", async () => {
    const codexHome = await createTempCodexHome();
    await writeFile(getCodexConfigPath(codexHome), "model_provider = [");

    const config = await readCodexConfig(codexHome);

    expect(config.parseStatus.ok).toBe(false);
    await expect(patchCodexConfig(codexHome, "proxy")).rejects.toBeInstanceOf(
      CodexConfigParseError,
    );
    await expect(readFile(getCodexConfigPath(codexHome), "utf8")).resolves.toBe(
      "model_provider = [",
    );
  });

  it("patches the top-level model_provider while preserving other content", async () => {
    const source = [
      "# Keep this comment",
      'model = "gpt-5.5"',
      'model_provider = "openai" # old provider',
      "",
      "[model_providers.proxy]",
      'name = "Proxy"',
      "",
    ].join("\n");

    expect(updateTopLevelModelProvider(source, "proxy")).toBe(
      [
        "# Keep this comment",
        'model = "gpt-5.5"',
        'model_provider = "proxy"',
        "",
        "[model_providers.proxy]",
        'name = "Proxy"',
        "",
      ].join("\n"),
    );
  });

  it("inserts model_provider before the first table when absent", () => {
    const source = ['model = "gpt-5.5"', "", "[model_providers.proxy]", 'name = "Proxy"', ""].join(
      "\n",
    );

    expect(updateTopLevelModelProvider(source, "proxy")).toBe(
      [
        'model = "gpt-5.5"',
        "",
        'model_provider = "proxy"',
        "[model_providers.proxy]",
        'name = "Proxy"',
        "",
      ].join("\n"),
    );
  });

  it("keeps an unknown current provider selectable", async () => {
    const codexHome = await createTempCodexHome();
    await writeFile(getCodexConfigPath(codexHome), 'model_provider = "internal"\n');

    const config = await readCodexConfig(codexHome);

    expect(config.providers).toContainEqual({
      builtIn: false,
      configured: false,
      id: "internal",
      label: "internal",
    });
  });

  it("patches config.toml through the store", async () => {
    const codexHome = await createTempCodexHome();
    const store = createCodexConfigStore(codexHome);

    await expect(store.patch({ modelProvider: "proxy" })).resolves.toMatchObject({
      modelProvider: "proxy",
      parseStatus: { ok: true },
    });

    await expect(readFile(getCodexConfigPath(codexHome), "utf8")).resolves.toBe(
      'model_provider = "proxy"\n',
    );
  });
});

describe("codex config API", () => {
  it("returns config.toml state", async () => {
    const codexHome = await createTempCodexHome();
    await writeFile(getCodexConfigPath(codexHome), 'model_provider = "openai"\n');
    const app = createRuntimeApi({
      codexHome,
      startedAt: 0,
      version: "test",
    });

    const response = await app.request("/config");

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      modelProvider: "openai",
      parseStatus: { ok: true },
    });
  });

  it("patches config.toml", async () => {
    const codexHome = await createTempCodexHome();
    const app = createRuntimeApi({
      codexHome,
      startedAt: 0,
      version: "test",
    });

    const response = await app.request("/config", {
      body: JSON.stringify({ modelProvider: "proxy" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      modelProvider: "proxy",
    });
    await expect(readFile(getCodexConfigPath(codexHome), "utf8")).resolves.toBe(
      'model_provider = "proxy"\n',
    );
  });

  it("returns conflict when config.toml cannot be parsed", async () => {
    const codexHome = await createTempCodexHome();
    await writeFile(getCodexConfigPath(codexHome), "model_provider = [");
    const app = createRuntimeApi({
      codexHome,
      startedAt: 0,
      version: "test",
    });

    const response = await app.request("/config", {
      body: JSON.stringify({ modelProvider: "openai" }),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });
});

async function createTempCodexHome(): Promise<string> {
  const codexHome = join(tmpdir(), `codexkit-config-${crypto.randomUUID()}`);

  await mkdir(codexHome, { recursive: true });

  return codexHome;
}
