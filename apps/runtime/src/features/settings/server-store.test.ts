import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { createRuntimeSettingsStore, getSettingsPath, readRuntimeSettings } from "./server-store";

describe("runtime settings storage", () => {
  it("returns default settings when settings.json does not exist", async () => {
    const codexHome = await createTempCodexHome();

    await expect(readRuntimeSettings(codexHome)).resolves.toEqual({
      locale: "en",
      theme: "system",
    });
  });

  it("normalizes invalid settings values", async () => {
    const codexHome = await createTempCodexHome();

    await mkdir(join(codexHome, ".codexkit"), { recursive: true });
    await writeFile(
      getSettingsPath(codexHome),
      JSON.stringify({
        locale: "fr",
        theme: "midnight",
      }),
    );

    await expect(readRuntimeSettings(codexHome)).resolves.toEqual({
      locale: "en",
      theme: "system",
    });
  });

  it("patches settings and writes normalized settings.json", async () => {
    const codexHome = await createTempCodexHome();
    const store = createRuntimeSettingsStore(codexHome);

    await expect(store.patch({ locale: "zh-CN", theme: "dark" })).resolves.toEqual({
      locale: "zh-CN",
      theme: "dark",
    });

    await expect(store.patch({ theme: "light" })).resolves.toEqual({
      locale: "zh-CN",
      theme: "light",
    });

    expect(JSON.parse(await readFile(getSettingsPath(codexHome), "utf8"))).toEqual({
      locale: "zh-CN",
      theme: "light",
    });
  });
});

async function createTempCodexHome(): Promise<string> {
  const codexHome = join(tmpdir(), `codexkit-runtime-${crypto.randomUUID()}`);

  await mkdir(codexHome, { recursive: true });

  return codexHome;
}
