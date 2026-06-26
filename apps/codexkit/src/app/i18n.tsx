import { i18n, type Messages } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  LANGUAGE_OPTIONS,
  normalizeLocale,
  patchAppearancePreferences,
  readAppearancePreferences,
  type LanguageOption,
  type LocaleCode,
} from "@/app/preferences";
import { messages as enMessages } from "@/locales/en/messages.po";
import { messages as pseudoMessages } from "@/locales/pseudo/messages.po";
import { messages as zhHansMessages } from "@/locales/zh-Hans/messages.po";

const DEFAULT_LOCALE: LocaleCode = "en";
const DEV_ONLY_LOCALE: LocaleCode = "pseudo";
const IS_DEV = import.meta.env.DEV;

const catalogs: Record<LocaleCode, Messages> = {
  en: enMessages,
  "zh-Hans": zhHansMessages,
  pseudo: pseudoMessages,
};

for (const locale of Object.keys(catalogs) as LocaleCode[]) {
  i18n.load(locale, catalogs[locale]);
}

i18n.activate(DEFAULT_LOCALE);

type I18nContextValue = {
  locale: LocaleCode;
  setLocale: (locale: LocaleCode) => void;
  effectiveLocale: LocaleCode;
  localeOptions: LanguageOption[];
  activeLocale: LanguageOption;
  isPseudoLocale: boolean;
};

const I18nStateContext = createContext<I18nContextValue | null>(null);

type I18nStateProviderProps = {
  children: ReactNode;
};

function isDevOnlyLanguageOption(option: LanguageOption): boolean {
  return option.devOnly === true;
}

export function I18nStateProvider({ children }: I18nStateProviderProps) {
  const [locale, setLocaleState] = useState<LocaleCode>(() => readAppearancePreferences().locale);

  const localeOptions = useMemo<LanguageOption[]>(() => {
    if (IS_DEV) {
      return [...LANGUAGE_OPTIONS];
    }

    return LANGUAGE_OPTIONS.filter((option) => !isDevOnlyLanguageOption(option));
  }, []);

  const effectiveLocale: LocaleCode =
    !IS_DEV && locale === DEV_ONLY_LOCALE ? DEFAULT_LOCALE : locale;

  const activeLocale =
    localeOptions.find((option) => option.key === effectiveLocale) ??
    localeOptions[0] ??
    LANGUAGE_OPTIONS[0];

  useEffect(() => {
    i18n.activate(effectiveLocale);
    document.documentElement.lang = activeLocale.htmlLang;
  }, [activeLocale.htmlLang, effectiveLocale]);

  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(patchAppearancePreferences({ locale: normalizeLocale(nextLocale) }).locale);
      },
      effectiveLocale,
      localeOptions,
      activeLocale,
      isPseudoLocale: effectiveLocale === DEV_ONLY_LOCALE,
    }),
    [activeLocale, effectiveLocale, locale, localeOptions],
  );

  return (
    <I18nProvider i18n={i18n}>
      <I18nStateContext.Provider value={contextValue}>{children}</I18nStateContext.Provider>
    </I18nProvider>
  );
}

export function useI18nState() {
  const context = useContext(I18nStateContext);

  if (!context) {
    throw new Error("useI18nState must be used within I18nStateProvider");
  }

  return context;
}
