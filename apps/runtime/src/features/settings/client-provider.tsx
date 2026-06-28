import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from "react";

import {
  overwriteGetLocale,
  overwriteSetLocale,
  setLocale as setParaglideLocale,
} from "@/locales/paraglide/runtime";

import { patchSettings, readSettings } from "./client";
import {
  createDefaultRuntimeSettings,
  normalizeLocale,
  normalizeRuntimeSettingsPatch,
  normalizeTheme,
  type RuntimeLocale,
  type RuntimeSettings,
  type RuntimeSettingsPatch,
  type ThemeMode,
} from "./model";

type RuntimeLocaleContextValue = {
  locale: RuntimeLocale;
  setLocalePreference: (locale: RuntimeLocale) => void;
};

type RuntimeThemePreferenceContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const RuntimeLocaleContext = createContext<RuntimeLocaleContextValue | null>(null);
const RuntimeThemePreferenceContext = createContext<RuntimeThemePreferenceContextValue | null>(
  null,
);
const SETTINGS_QUERY_KEY = ["settings"] as const;
let runtimeLocalePreference = createDefaultRuntimeSettings().locale;

// The configured Paraglide strategy reads browser language, so runtime settings provide the UI locale.
overwriteGetLocale(() => runtimeLocalePreference);
overwriteSetLocale((nextLocale) => {
  runtimeLocalePreference = normalizeLocale(nextLocale);
});

type RuntimeSettingsProviderProps = {
  children: ReactNode;
};

export function RuntimeSettingsProvider({ children }: RuntimeSettingsProviderProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    initialData: createDefaultRuntimeSettings,
    queryFn: readSettings,
    queryKey: SETTINGS_QUERY_KEY,
  });
  const settings = settingsQuery.data;
  runtimeLocalePreference = settings.locale;

  useEffect(() => {
    void setParaglideLocale(settings.locale, { reload: false });
  }, [settings.locale]);

  useEffect(() => {
    if (settingsQuery.isError) {
      console.error("Unable to load CodexKit settings.", settingsQuery.error);
    }
  }, [settingsQuery.error, settingsQuery.isError]);

  const { mutate: mutateSettings } = useMutation({
    mutationFn: patchSettings,
    onError(error: unknown) {
      console.error("Unable to save CodexKit settings.", error);
    },
    async onMutate(patch: RuntimeSettingsPatch) {
      const normalizedPatch = normalizeRuntimeSettingsPatch(patch);

      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });
      queryClient.setQueryData<RuntimeSettings>(SETTINGS_QUERY_KEY, (currentSettings) => ({
        ...(currentSettings ?? createDefaultRuntimeSettings()),
        ...normalizedPatch,
      }));
    },
    onSuccess(nextSettings) {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, nextSettings);
    },
  });

  const setLocalePreference = useCallback(
    (nextLocale: RuntimeLocale) => {
      const locale = normalizeLocale(nextLocale);

      mutateSettings({ locale });
    },
    [mutateSettings],
  );
  const setTheme = useCallback(
    (nextTheme: ThemeMode) => {
      const theme = normalizeTheme(nextTheme);

      mutateSettings({ theme });
    },
    [mutateSettings],
  );

  const localeContextValue = useMemo<RuntimeLocaleContextValue>(
    () => ({
      locale: settings.locale,
      setLocalePreference,
    }),
    [settings.locale, setLocalePreference],
  );
  const themePreferenceContextValue = useMemo<RuntimeThemePreferenceContextValue>(
    () => ({
      theme: settings.theme,
      setTheme,
    }),
    [settings.theme, setTheme],
  );

  return (
    <RuntimeLocaleContext.Provider value={localeContextValue}>
      <RuntimeThemePreferenceContext.Provider value={themePreferenceContextValue}>
        {children}
      </RuntimeThemePreferenceContext.Provider>
    </RuntimeLocaleContext.Provider>
  );
}

export function useRuntimeLocale() {
  const context = use(RuntimeLocaleContext);

  if (!context) {
    throw new Error("useRuntimeLocale must be used within RuntimeSettingsProvider");
  }

  return context;
}

export function useRuntimeThemePreference() {
  const context = use(RuntimeThemePreferenceContext);

  if (!context) {
    throw new Error("useRuntimeThemePreference must be used within RuntimeSettingsProvider");
  }

  return context;
}
