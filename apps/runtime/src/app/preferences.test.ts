import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  APPEARANCE_STORAGE_KEY,
  createDefaultAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
} from "@/app/preferences";

describe("appearance preferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses default preferences when storage is empty", () => {
    expect(createDefaultAppearancePreferences()).toEqual({
      themeMode: "system",
    });
    expect(readAppearancePreferences()).toEqual({
      themeMode: "system",
    });
  });

  it("falls back to defaults for invalid stored JSON", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, "{");

    expect(readAppearancePreferences()).toEqual({
      themeMode: "system",
    });
  });

  it("normalizes unknown stored theme values", () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ locale: "fr-FR", themeMode: "sepia" }),
    );

    expect(readAppearancePreferences()).toEqual({
      themeMode: "system",
    });
  });

  it("ignores stale locale values when reading partial stored preferences", () => {
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ locale: "zh-Hans", themeMode: "dark" }),
    );

    expect(readAppearancePreferences()).toEqual({
      themeMode: "dark",
    });
  });

  it("writes normalized preferences for stable reads", () => {
    writeAppearancePreferences({
      themeMode: "dark",
    });

    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({
      themeMode: "dark",
    });
    expect(readAppearancePreferences()).toEqual({
      themeMode: "dark",
    });
  });
});
