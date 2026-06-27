import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  patchAppearancePreferences,
  readAppearancePreferences,
  type ResolvedTheme,
  type ThemeMode,
} from "@/app/preferences";

type ThemeContextValue = {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  resolvedTheme: ResolvedTheme;
};

const ThemeStateContext = createContext<ThemeContextValue | null>(null);

type ThemeStateProviderProps = {
  children: ReactNode;
};

function readSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) {
    return false;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveTheme(themeMode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (themeMode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return themeMode;
}

export function ThemeStateProvider({ children }: ThemeStateProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(
    () => readAppearancePreferences().themeMode,
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(readSystemPrefersDark);
  const resolvedTheme = resolveTheme(themeMode, systemPrefersDark);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => {
      setSystemPrefersDark(mediaQuery.matches);
    };

    updateSystemTheme();
    mediaQuery.addEventListener("change", updateSystemTheme);

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      themeMode,
      setThemeMode: (nextThemeMode) => {
        setThemeModeState(patchAppearancePreferences({ themeMode: nextThemeMode }).themeMode);
      },
      resolvedTheme,
    }),
    [resolvedTheme, themeMode],
  );

  return <ThemeStateContext.Provider value={contextValue}>{children}</ThemeStateContext.Provider>;
}

export function useThemeState() {
  const context = useContext(ThemeStateContext);

  if (!context) {
    throw new Error("useThemeState must be used within ThemeStateProvider");
  }

  return context;
}
