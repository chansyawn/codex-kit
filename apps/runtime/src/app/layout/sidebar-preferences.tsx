"use client";

import { LanguagesIcon, MoonIcon, SunIcon } from "lucide-react";

import { useThemeState } from "@/app/theme";
import { useRuntimeLocale } from "@/features/settings/client-provider";
import { THEME_OPTIONS, type RuntimeLocale, type ThemeMode } from "@/features/settings/model";
import { m } from "@/locales/paraglide/messages";
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
  const { locale, setLocalePreference } = useRuntimeLocale();
  const { resolvedTheme, setThemeMode, themeMode } = useThemeState();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton />}>
            <LanguagesIcon aria-hidden="true" />
            <span>{m.preference_language_title()}</span>
            <span className="text-muted-foreground ms-auto text-xs">{localeLabel(locale)}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{m.preference_language_title()}</DropdownMenuLabel>
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
                  {localeLabel(option)}
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
            <span>{m.preference_theme_title()}</span>
            <span className="text-muted-foreground ms-auto text-xs">
              {themeModeLabel(themeMode)}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{m.preference_theme_title()}</DropdownMenuLabel>
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
                  {themeModeLabel(option)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function localeLabel(locale: RuntimeLocale): string {
  switch (locale) {
    case "en":
      return m.language_english();
    case "zh-CN":
      return m.language_chinese();
  }
}

function themeModeLabel(themeMode: ThemeMode): string {
  switch (themeMode) {
    case "dark":
      return m.preference_theme_dark();
    case "light":
      return m.preference_theme_light();
    case "system":
      return m.preference_theme_system();
  }
}
