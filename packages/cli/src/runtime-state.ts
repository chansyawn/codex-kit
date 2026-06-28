import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CODEXKIT_DIRECTORY_NAME = ".codexkit";
const RUNTIME_STATE_FILE_NAME = "runtime.json";

export type RuntimeState = {
  host: string;
  pid: number;
  port: number;
  startedAt: string;
};

export function getCodexKitHome(codexHome: string): string {
  return join(codexHome, CODEXKIT_DIRECTORY_NAME);
}

export function getRuntimeStatePath(codexHome: string): string {
  return join(getCodexKitHome(codexHome), RUNTIME_STATE_FILE_NAME);
}

export async function writeRuntimeState(codexHome: string, state: RuntimeState): Promise<void> {
  await mkdir(getCodexKitHome(codexHome), { recursive: true });
  await writeFile(getRuntimeStatePath(codexHome), `${JSON.stringify(state, null, 2)}\n`);
}

export async function readRuntimeState(codexHome: string): Promise<RuntimeState | null> {
  try {
    return JSON.parse(await readFile(getRuntimeStatePath(codexHome), "utf8")) as RuntimeState;
  } catch {
    return null;
  }
}

export async function removeRuntimeState(codexHome: string): Promise<void> {
  await rm(getRuntimeStatePath(codexHome), { force: true });
}
