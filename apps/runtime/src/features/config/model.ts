export const BUILT_IN_MODEL_PROVIDERS = ["openai"] as const;

export type CodexConfigProviderOption = {
  id: string;
  label: string;
  builtIn: boolean;
  configured: boolean;
};

export type CodexConfigParseStatus =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

export type CodexConfig = {
  configPath: string;
  modelProvider: string;
  parseStatus: CodexConfigParseStatus;
  providers: CodexConfigProviderOption[];
};

export type CodexConfigPatch = {
  modelProvider?: string;
};

const DEFAULT_MODEL_PROVIDER = "openai";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createDefaultCodexConfig(configPath: string): CodexConfig {
  return {
    configPath,
    modelProvider: DEFAULT_MODEL_PROVIDER,
    parseStatus: { ok: true },
    providers: createProviderOptions({
      configuredProviders: [],
      currentProvider: DEFAULT_MODEL_PROVIDER,
      providerLabels: new Map(),
    }),
  };
}

export function normalizeModelProvider(input: unknown): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  const modelProvider = input.trim();

  return modelProvider.length > 0 ? modelProvider : undefined;
}

export function normalizeCodexConfigPatch(input: unknown): CodexConfigPatch {
  if (!isRecord(input)) {
    return {};
  }

  return {
    modelProvider: normalizeModelProvider(input.modelProvider),
  };
}

export function createProviderOptions({
  configuredProviders,
  currentProvider,
  providerLabels,
}: {
  configuredProviders: string[];
  currentProvider: string;
  providerLabels: Map<string, string>;
}): CodexConfigProviderOption[] {
  const providerIds = new Set<string>([...BUILT_IN_MODEL_PROVIDERS, ...configuredProviders]);
  providerIds.add(currentProvider);

  return Array.from(providerIds)
    .filter((providerId) => providerId.length > 0)
    .sort((leftProviderId, rightProviderId) => {
      const leftBuiltInIndex = BUILT_IN_MODEL_PROVIDERS.indexOf(
        leftProviderId as (typeof BUILT_IN_MODEL_PROVIDERS)[number],
      );
      const rightBuiltInIndex = BUILT_IN_MODEL_PROVIDERS.indexOf(
        rightProviderId as (typeof BUILT_IN_MODEL_PROVIDERS)[number],
      );

      if (leftBuiltInIndex >= 0 || rightBuiltInIndex >= 0) {
        return (
          (leftBuiltInIndex < 0 ? Number.MAX_SAFE_INTEGER : leftBuiltInIndex) -
          (rightBuiltInIndex < 0 ? Number.MAX_SAFE_INTEGER : rightBuiltInIndex)
        );
      }

      return leftProviderId.localeCompare(rightProviderId);
    })
    .map((providerId) => ({
      builtIn: BUILT_IN_MODEL_PROVIDERS.includes(
        providerId as (typeof BUILT_IN_MODEL_PROVIDERS)[number],
      ),
      configured: configuredProviders.includes(providerId),
      id: providerId,
      label: providerLabels.get(providerId) ?? providerId,
    }));
}
