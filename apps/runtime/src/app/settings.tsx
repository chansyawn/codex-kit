import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { patchSettings, readSettings } from "@/app/codexkit-api";
import { setLocale as setParaglideLocale } from "@/paraglide/runtime";
import {
  createDefaultRuntimeSettings,
  normalizeLocale,
  normalizeRuntimeSettingsPatch,
  normalizeTheme,
  type RuntimeLocale,
  type RuntimeSettings,
  type RuntimeSettingsPatch,
  type ThemeMode,
} from "@/shared/settings";

type RuntimeSettingsContextValue = {
  settings: RuntimeSettings;
  setLocalePreference: (locale: RuntimeLocale) => void;
  setTheme: (theme: ThemeMode) => void;
};

const RuntimeSettingsContext = createContext<RuntimeSettingsContextValue | null>(null);
const SETTINGS_QUERY_KEY = ["settings"] as const;

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

  useEffect(() => {
    void setParaglideLocale(settings.locale);
  }, [settings.locale]);

  useEffect(() => {
    if (settingsQuery.isError) {
      console.error("Unable to load CodexKit settings.", settingsQuery.error);
    }
  }, [settingsQuery.error, settingsQuery.isError]);

  const settingsMutation = useMutation({
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

  const contextValue = useMemo<RuntimeSettingsContextValue>(
    () => ({
      settings,
      setLocalePreference: (nextLocale) => {
        const locale = normalizeLocale(nextLocale);

        settingsMutation.mutate({ locale });
      },
      setTheme: (nextTheme) => {
        const theme = normalizeTheme(nextTheme);

        settingsMutation.mutate({ theme });
      },
    }),
    [settings, settingsMutation],
  );

  return (
    <RuntimeSettingsContext.Provider value={contextValue}>
      {children}
    </RuntimeSettingsContext.Provider>
  );
}

export function useRuntimeSettings() {
  const context = useContext(RuntimeSettingsContext);

  if (!context) {
    throw new Error("useRuntimeSettings must be used within RuntimeSettingsProvider");
  }

  return context;
}
