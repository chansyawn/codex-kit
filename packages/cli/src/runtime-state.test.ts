import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { getRuntimeStatePath, readRuntimeState, writeRuntimeState } from "./runtime-state.ts";

describe("runtime state storage", () => {
  it("writes runtime state under CODEX_HOME/.codexkit/runtime.json", async () => {
    const codexHome = await createTempCodexHome();
    const state = {
      host: "127.0.0.1",
      pid: 123,
      port: 456,
      startedAt: "2026-06-28T00:00:00.000Z",
    };

    await writeRuntimeState(codexHome, state);

    expect(getRuntimeStatePath(codexHome)).toBe(join(codexHome, ".codexkit", "runtime.json"));
    await expect(readRuntimeState(codexHome)).resolves.toEqual(state);
  });

  it("does not read the legacy CODEX_HOME/codexkit-runtime.json path", async () => {
    const codexHome = await createTempCodexHome();
    const legacyState = {
      host: "127.0.0.1",
      pid: 123,
      port: 456,
      startedAt: "2026-06-28T00:00:00.000Z",
    };

    await writeFile(join(codexHome, "codexkit-runtime.json"), JSON.stringify(legacyState));

    await expect(readRuntimeState(codexHome)).resolves.toBeNull();
  });
});

async function createTempCodexHome(): Promise<string> {
  const codexHome = join(tmpdir(), `codexkit-cli-${crypto.randomUUID()}`);

  await mkdir(codexHome, { recursive: true });

  return codexHome;
}
