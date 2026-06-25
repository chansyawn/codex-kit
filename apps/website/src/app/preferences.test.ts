import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  APPEARANCE_STORAGE_KEY,
  createDefaultAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
} from "@/app/preferences";

function setNavigatorLanguage(language: string): void {
  Object.defineProperty(window.navigator, "languages", {
    configurable: true,
    value: [language],
  });
  Object.defineProperty(window.navigator, "language", {
    configurable: true,
    value: language,
  });
}

describe("appearance preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    setNavigatorLanguage("en-US");
  });

  afterEach(() => {
    localStorage.clear();
    setNavigatorLanguage("en-US");
  });

  it("uses default preferences when storage is empty", () => {
    expect(createDefaultAppearancePreferences()).toEqual({
      locale: "en",
      themeMode: "system",
    });
    expect(readAppearancePreferences()).toEqual({
      locale: "en",
      themeMode: "system",
    });
  });

  it("falls back to defaults for invalid stored JSON", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "{");

    expect(readAppearancePreferences()).toEqual({
      locale: "en",
      themeMode: "system",
    });
  });

  it("normalizes unknown stored locale and theme values", () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ locale: "fr-FR", themeMode: "sepia" }),
    );

    expect(readAppearancePreferences()).toEqual({
      locale: "en",
      themeMode: "system",
    });
  });

  it("merges partial stored preferences with browser defaults", () => {
    setNavigatorLanguage("zh-CN");
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ themeMode: "dark" }));

    expect(readAppearancePreferences()).toEqual({
      locale: "zh-Hans",
      themeMode: "dark",
    });
  });

  it("writes normalized preferences for stable reads", () => {
    writeAppearancePreferences({
      locale: "zh-Hans",
      themeMode: "dark",
    });

    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({
      locale: "zh-Hans",
      themeMode: "dark",
    });
    expect(readAppearancePreferences()).toEqual({
      locale: "zh-Hans",
      themeMode: "dark",
    });
  });
});
