export const APPEARANCE_STORAGE_KEY = "codex-kit.codexkit.appearance.v1";

export const LOCALE_CODES = ["en", "zh-Hans", "pseudo"] as const;
export const THEME_MODE_OPTIONS = ["system", "light", "dark"] as const;

export type LocaleCode = (typeof LOCALE_CODES)[number];
export type ThemeMode = (typeof THEME_MODE_OPTIONS)[number];
export type ResolvedTheme = "light" | "dark";

export type LanguageOption = {
  key: LocaleCode;
  name: string;
  rtl: boolean;
  htmlLang: string;
  devOnly?: boolean;
};

export type AppearancePreferences = {
  locale: LocaleCode;
  themeMode: ThemeMode;
};

export const LANGUAGE_OPTIONS = [
  { key: "en", name: "English", rtl: false, htmlLang: "en" },
  { key: "zh-Hans", name: "简体中文", rtl: false, htmlLang: "zh-Hans" },
  { key: "pseudo", name: "Pseudo RTL", rtl: true, htmlLang: "en-XA", devOnly: true },
] as const satisfies readonly LanguageOption[];

const DEFAULT_LOCALE: LocaleCode = "en";
const DEFAULT_THEME_MODE: ThemeMode = "system";
const IS_DEV = import.meta.env.DEV;

type AppearancePreferencePatch = Partial<AppearancePreferences>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBrowserLocaleCandidates(): string[] {
  if (typeof navigator === "undefined") {
    return [];
  }

  return [...navigator.languages, navigator.language].filter((locale) => locale.length > 0);
}

export function normalizeLocale(input: unknown): LocaleCode {
  if (typeof input !== "string" || input.length === 0) {
    return DEFAULT_LOCALE;
  }

  if (input === "pseudo") {
    return IS_DEV ? "pseudo" : DEFAULT_LOCALE;
  }

  if (input === "zh-Hans" || input.startsWith("zh")) {
    return "zh-Hans";
  }

  if (input === "en" || input.startsWith("en")) {
    return "en";
  }

  return DEFAULT_LOCALE;
}

export function normalizeThemeMode(input: unknown): ThemeMode {
  return input === "light" || input === "dark" || input === "system" ? input : DEFAULT_THEME_MODE;
}

export function readPreferredLocale(): LocaleCode {
  for (const locale of readBrowserLocaleCandidates()) {
    const normalizedLocale = normalizeLocale(locale);

    if (normalizedLocale !== DEFAULT_LOCALE || locale.startsWith("en")) {
      return normalizedLocale;
    }
  }

  return DEFAULT_LOCALE;
}

export function createDefaultAppearancePreferences(): AppearancePreferences {
  return {
    locale: readPreferredLocale(),
    themeMode: DEFAULT_THEME_MODE,
  };
}

function readLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function parseStoredPreferences(rawValue: string | null): Partial<AppearancePreferences> {
  if (!rawValue) {
    return {};
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      return {};
    }

    const preferences: Partial<AppearancePreferences> = {};

    if ("locale" in parsedValue) {
      preferences.locale = normalizeLocale(parsedValue.locale);
    }

    if ("themeMode" in parsedValue) {
      preferences.themeMode = normalizeThemeMode(parsedValue.themeMode);
    }

    return preferences;
  } catch {
    return {};
  }
}

export function readAppearancePreferences(storage: Storage | null = readLocalStorage()) {
  const defaultPreferences = createDefaultAppearancePreferences();

  if (!storage) {
    return defaultPreferences;
  }

  return {
    ...defaultPreferences,
    ...parseStoredPreferences(storage.getItem(APPEARANCE_STORAGE_KEY)),
  };
}

export function writeAppearancePreferences(
  preferences: AppearancePreferences,
  storage: Storage | null = readLocalStorage(),
): AppearancePreferences {
  const normalizedPreferences = {
    locale: normalizeLocale(preferences.locale),
    themeMode: normalizeThemeMode(preferences.themeMode),
  };

  storage?.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(normalizedPreferences));

  return normalizedPreferences;
}

export function patchAppearancePreferences(
  patch: AppearancePreferencePatch,
  storage: Storage | null = readLocalStorage(),
): AppearancePreferences {
  return writeAppearancePreferences(
    {
      ...readAppearancePreferences(storage),
      ...patch,
    },
    storage,
  );
}
