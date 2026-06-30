import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, use, useCallback, useEffect, useMemo, type ReactNode } from "react";

import { m } from "@/locales/paraglide/messages";
import {
  overwriteGetLocale,
  overwriteSetLocale,
  setLocale as setParaglideLocale,
} from "@/locales/paraglide/runtime";

import { patchSettings, readSettings } from "./client";
import { SETTINGS_QUERY_KEY } from "./client-provider";
import {
  createDefaultRuntimeSettings,
  normalizeLocale,
  normalizeRuntimeSettingsPatch,
  type RuntimeLocale,
  type RuntimeSettings,
  type RuntimeSettingsPatch,
} from "./model";

type RuntimeI18nContextValue = {
  locale: RuntimeLocale;
  setLocalePreference: (locale: RuntimeLocale) => void;
  t: typeof m;
};

const RuntimeI18nContext = createContext<RuntimeI18nContextValue | null>(null);
let runtimeLocalePreference = createDefaultRuntimeSettings().locale;

overwriteGetLocale(() => runtimeLocalePreference);
overwriteSetLocale((nextLocale) => {
  runtimeLocalePreference = normalizeLocale(nextLocale);
});

type RuntimeI18nProviderProps = {
  children: ReactNode;
};

export function RuntimeI18nProvider({ children }: RuntimeI18nProviderProps) {
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    initialData: createDefaultRuntimeSettings,
    queryFn: readSettings,
    queryKey: SETTINGS_QUERY_KEY,
  });
  const locale = settingsQuery.data.locale;
  runtimeLocalePreference = locale;

  useEffect(() => {
    void setParaglideLocale(locale, { reload: false });
  }, [locale]);

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
      mutateSettings({ locale: normalizeLocale(nextLocale) });
    },
    [mutateSettings],
  );

  const contextValue = useMemo<RuntimeI18nContextValue>(
    () => ({
      locale,
      setLocalePreference,
      t: m,
    }),
    [locale, setLocalePreference],
  );

  return <RuntimeI18nContext.Provider value={contextValue}>{children}</RuntimeI18nContext.Provider>;
}

export function useRuntimeI18n() {
  const context = use(RuntimeI18nContext);

  if (!context) {
    throw new Error("useRuntimeI18n must be used within RuntimeI18nProvider");
  }

  return context;
}
