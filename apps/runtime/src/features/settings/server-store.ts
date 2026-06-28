import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  createDefaultRuntimeSettings,
  normalizeRuntimeSettings,
  normalizeRuntimeSettingsPatch,
  type RuntimeSettings,
  type RuntimeSettingsPatch,
} from "./model";

const CODEXKIT_DIRECTORY_NAME = ".codexkit";
const SETTINGS_FILE_NAME = "settings.json";

export type RuntimeSettingsStore = {
  read: () => Promise<RuntimeSettings>;
  patch: (patch: RuntimeSettingsPatch) => Promise<RuntimeSettings>;
};

export function getCodexKitHome(codexHome: string): string {
  return join(codexHome, CODEXKIT_DIRECTORY_NAME);
}

export function getSettingsPath(codexHome: string): string {
  return join(getCodexKitHome(codexHome), SETTINGS_FILE_NAME);
}

export function createRuntimeSettingsStore(codexHome: string): RuntimeSettingsStore {
  return {
    async read() {
      return readRuntimeSettings(codexHome);
    },
    async patch(patch: RuntimeSettingsPatch) {
      const settings = {
        ...(await readRuntimeSettings(codexHome)),
        ...normalizeRuntimeSettingsPatch(patch),
      };

      return writeRuntimeSettings(codexHome, settings);
    },
  };
}

export async function readRuntimeSettings(codexHome: string): Promise<RuntimeSettings> {
  try {
    return normalizeRuntimeSettings(JSON.parse(await readFile(getSettingsPath(codexHome), "utf8")));
  } catch {
    return createDefaultRuntimeSettings();
  }
}

export async function writeRuntimeSettings(
  codexHome: string,
  settings: RuntimeSettings,
): Promise<RuntimeSettings> {
  const normalizedSettings = normalizeRuntimeSettings(settings);

  await mkdir(getCodexKitHome(codexHome), { recursive: true });
  await writeFile(getSettingsPath(codexHome), `${JSON.stringify(normalizedSettings, null, 2)}\n`);

  return normalizedSettings;
}
