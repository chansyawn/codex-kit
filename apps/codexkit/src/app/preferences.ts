export const APPEARANCE_STORAGE_KEY = "codex-kit.codexkit.appearance.v1";

export const THEME_MODE_OPTIONS = ["system", "light", "dark"] as const;

export type ThemeMode = (typeof THEME_MODE_OPTIONS)[number];
export type ResolvedTheme = "light" | "dark";

export type AppearancePreferences = {
  themeMode: ThemeMode;
};

const DEFAULT_THEME_MODE: ThemeMode = "system";

type AppearancePreferencePatch = Partial<AppearancePreferences>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeThemeMode(input: unknown): ThemeMode {
  return input === "light" || input === "dark" || input === "system" ? input : DEFAULT_THEME_MODE;
}

export function createDefaultAppearancePreferences(): AppearancePreferences {
  return {
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
