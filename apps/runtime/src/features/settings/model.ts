export const THEME_OPTIONS = ["system", "light", "dark"] as const;
export const LOCALE_OPTIONS = ["en", "zh-CN"] as const;

export type ThemeMode = (typeof THEME_OPTIONS)[number];
export type ResolvedTheme = "light" | "dark";
export type RuntimeLocale = (typeof LOCALE_OPTIONS)[number];

export type RuntimeSettings = {
  theme: ThemeMode;
  locale: RuntimeLocale;
};

export type RuntimeSettingsPatch = Partial<RuntimeSettings>;

const DEFAULT_SETTINGS: RuntimeSettings = {
  locale: "en",
  theme: "system",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeTheme(input: unknown): ThemeMode {
  return input === "light" || input === "dark" || input === "system"
    ? input
    : DEFAULT_SETTINGS.theme;
}

export function normalizeLocale(input: unknown): RuntimeLocale {
  return input === "en" || input === "zh-CN" ? input : DEFAULT_SETTINGS.locale;
}

export function createDefaultRuntimeSettings(): RuntimeSettings {
  return {
    ...DEFAULT_SETTINGS,
  };
}

export function normalizeRuntimeSettings(input: unknown): RuntimeSettings {
  const defaultSettings = createDefaultRuntimeSettings();

  if (!isRecord(input)) {
    return defaultSettings;
  }

  return {
    locale: "locale" in input ? normalizeLocale(input.locale) : defaultSettings.locale,
    theme: "theme" in input ? normalizeTheme(input.theme) : defaultSettings.theme,
  };
}

export function normalizeRuntimeSettingsPatch(input: unknown): RuntimeSettingsPatch {
  if (!isRecord(input)) {
    return {};
  }

  const patch: RuntimeSettingsPatch = {};

  if ("locale" in input) {
    patch.locale = normalizeLocale(input.locale);
  }

  if ("theme" in input) {
    patch.theme = normalizeTheme(input.theme);
  }

  return patch;
}
