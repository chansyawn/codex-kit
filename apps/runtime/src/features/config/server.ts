import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parse, stringify, type TomlTable } from "smol-toml";

import {
  createDefaultCodexConfig,
  createProviderOptions,
  normalizeModelProvider,
  type CodexConfig,
} from "./model";

const CONFIG_FILE_NAME = "config.toml";
const DEFAULT_MODEL_PROVIDER = "openai";

type ParsedCodexConfig = {
  configuredProviders: string[];
  modelProvider: string;
  providerLabels: Map<string, string>;
};

export class CodexConfigParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CodexConfigParseError";
  }
}

export type CodexConfigStore = {
  patch: (patch: { modelProvider?: string }) => Promise<CodexConfig>;
  read: () => Promise<CodexConfig>;
};

export function getCodexConfigPath(codexHome: string): string {
  return join(codexHome, CONFIG_FILE_NAME);
}

export function createCodexConfigStore(codexHome: string): CodexConfigStore {
  return {
    async patch(patch) {
      const nextModelProvider = normalizeModelProvider(patch.modelProvider);

      if (!nextModelProvider) {
        return readCodexConfig(codexHome);
      }

      return patchCodexConfig(codexHome, nextModelProvider);
    },
    async read() {
      return readCodexConfig(codexHome);
    },
  };
}

export async function readCodexConfig(codexHome: string): Promise<CodexConfig> {
  const configPath = getCodexConfigPath(codexHome);
  const source = await readConfigSource(configPath);

  if (source === undefined) {
    return createDefaultCodexConfig(configPath);
  }

  let parsedConfig: ParsedCodexConfig;
  try {
    parsedConfig = parseCodexConfigSource(source);
  } catch (error) {
    return {
      ...createDefaultCodexConfig(configPath),
      parseStatus: {
        message: error instanceof Error ? error.message : "Unable to parse config.toml.",
        ok: false,
      },
    };
  }

  return createCodexConfig(configPath, parsedConfig, { ok: true });
}

export async function patchCodexConfig(
  codexHome: string,
  modelProvider: string,
): Promise<CodexConfig> {
  const configPath = getCodexConfigPath(codexHome);
  const source = (await readConfigSource(configPath)) ?? "";

  try {
    parseCodexConfigSource(source);
  } catch (error) {
    throw new CodexConfigParseError(
      error instanceof Error ? error.message : "Unable to parse config.toml.",
    );
  }

  const nextSource = updateTopLevelModelProvider(source, modelProvider);

  try {
    parseCodexConfigSource(nextSource);
  } catch (error) {
    throw new CodexConfigParseError(
      error instanceof Error ? error.message : "Unable to write a valid config.toml.",
    );
  }

  await mkdir(codexHome, { recursive: true });
  await writeFile(configPath, nextSource);

  return readCodexConfig(codexHome);
}

export function parseCodexConfigSource(source: string): ParsedCodexConfig {
  const table = parse(source);
  const modelProvider = normalizeModelProvider(table.model_provider) ?? DEFAULT_MODEL_PROVIDER;
  const providerLabels = new Map<string, string>();
  const configuredProviders = Object.entries(readModelProviders(table)).map(
    ([providerId, value]) => {
      if (isTomlTable(value)) {
        const label = normalizeModelProvider(value.name);

        if (label) {
          providerLabels.set(providerId, label);
        }
      }

      return providerId;
    },
  );

  return {
    configuredProviders,
    modelProvider,
    providerLabels,
  };
}

export function updateTopLevelModelProvider(source: string, modelProvider: string): string {
  const modelProviderLine = stringify({ model_provider: modelProvider }).trimEnd();
  const tableStartIndex = findFirstTableStartIndex(source);
  const topLevelSource = source.slice(0, tableStartIndex);
  const remainingSource = source.slice(tableStartIndex);
  const topLevelModelProviderPattern = /^(\s*)model_provider\s*=.*$/m;

  if (topLevelModelProviderPattern.test(topLevelSource)) {
    return `${topLevelSource.replace(
      topLevelModelProviderPattern,
      `$1${modelProviderLine}`,
    )}${remainingSource}`;
  }

  if (source.trim().length === 0) {
    return `${modelProviderLine}\n`;
  }

  const insertion = `${modelProviderLine}\n`;

  if (tableStartIndex === source.length) {
    return source.endsWith("\n") ? `${source}${insertion}` : `${source}\n${insertion}`;
  }

  const topLevelPrefix =
    topLevelSource.length === 0 || topLevelSource.endsWith("\n")
      ? topLevelSource
      : `${topLevelSource}\n`;

  return `${topLevelPrefix}${insertion}${remainingSource}`;
}

function createCodexConfig(
  configPath: string,
  parsedConfig: ParsedCodexConfig,
  parseStatus: CodexConfig["parseStatus"],
): CodexConfig {
  return {
    configPath,
    modelProvider: parsedConfig.modelProvider,
    parseStatus,
    providers: createProviderOptions({
      configuredProviders: parsedConfig.configuredProviders,
      currentProvider: parsedConfig.modelProvider,
      providerLabels: parsedConfig.providerLabels,
    }),
  };
}

async function readConfigSource(configPath: string): Promise<string | undefined> {
  try {
    return await readFile(configPath, "utf8");
  } catch (error) {
    if (isNotFoundError(error)) {
      return undefined;
    }

    throw error;
  }
}

function readModelProviders(table: TomlTable): Record<string, unknown> {
  const providers = table.model_providers;

  return isRecord(providers) ? providers : {};
}

function findFirstTableStartIndex(source: string): number {
  const tableHeaderMatch = /^[[].*]\s*(?:#.*)?$/m.exec(source);

  return tableHeaderMatch?.index ?? source.length;
}

function isTomlTable(value: unknown): value is TomlTable {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNotFoundError(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}
