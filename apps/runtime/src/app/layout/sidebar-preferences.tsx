"use client";

import { LanguagesIcon, MoonIcon, SunIcon } from "lucide-react";

import { useThemeState } from "@/app/theme";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { THEME_OPTIONS, type RuntimeLocale, type ThemeMode } from "@/features/settings/model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/ui/components/sidebar";

const LOCALE_OPTIONS = ["en", "zh-CN"] as const satisfies readonly RuntimeLocale[];

export function SidebarPreferences() {
  const { locale, setLocalePreference, t } = useRuntimeI18n();
  const { resolvedTheme, setThemeMode, themeMode } = useThemeState();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton />}>
            <LanguagesIcon aria-hidden="true" />
            <span>{t.preference_language_title()}</span>
            <span className="text-muted-foreground ms-auto text-xs">{localeLabel(locale, t)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t.preference_language_title()}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={locale}
              onValueChange={(value) => {
                setLocalePreference(value as RuntimeLocale);
              }}
            >
              {LOCALE_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {localeLabel(option, t)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton />}>
            {resolvedTheme === "dark" ? (
              <MoonIcon aria-hidden="true" />
            ) : (
              <SunIcon aria-hidden="true" />
            )}
            <span>{t.preference_theme_title()}</span>
            <span className="text-muted-foreground ms-auto text-xs">
              {themeModeLabel(themeMode, t)}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t.preference_theme_title()}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={themeMode}
              onValueChange={(value) => {
                setThemeMode(value as ThemeMode);
              }}
            >
              {THEME_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option} value={option}>
                  {themeModeLabel(option, t)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

type RuntimeMessages = ReturnType<typeof useRuntimeI18n>["t"];

function localeLabel(locale: RuntimeLocale, t: RuntimeMessages): string {
  switch (locale) {
    case "en":
      return t.language_english();
    case "zh-CN":
      return t.language_chinese();
  }
}

function themeModeLabel(themeMode: ThemeMode, t: RuntimeMessages): string {
  switch (themeMode) {
    case "dark":
      return t.preference_theme_dark();
    case "light":
      return t.preference_theme_light();
    case "system":
      return t.preference_theme_system();
  }
}
