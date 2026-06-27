import { describe, expect, it } from "vite-plus/test";

import {
  APPEARANCE_STORAGE_KEY,
  createDefaultAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
} from "@/app/preferences";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("appearance preferences", () => {
  it("uses default preferences when storage is empty", () => {
    const storage = createMemoryStorage();

    expect(createDefaultAppearancePreferences()).toEqual({
      themeMode: "system",
    });
    expect(readAppearancePreferences(storage)).toEqual({
      themeMode: "system",
    });
  });

  it("falls back to defaults for invalid stored JSON", () => {
    const storage = createMemoryStorage();
    storage.setItem(APPEARANCE_STORAGE_KEY, "{");

    expect(readAppearancePreferences(storage)).toEqual({
      themeMode: "system",
    });
  });

  it("normalizes unknown stored theme values", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ locale: "fr-FR", themeMode: "sepia" }),
    );

    expect(readAppearancePreferences(storage)).toEqual({
      themeMode: "system",
    });
  });

  it("ignores stale locale values when reading partial stored preferences", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ locale: "zh-Hans", themeMode: "dark" }),
    );

    expect(readAppearancePreferences(storage)).toEqual({
      themeMode: "dark",
    });
  });

  it("writes normalized preferences for stable reads", () => {
    const storage = createMemoryStorage();
    writeAppearancePreferences(
      {
        themeMode: "dark",
      },
      storage,
    );

    expect(JSON.parse(storage.getItem(APPEARANCE_STORAGE_KEY) ?? "{}")).toEqual({
      themeMode: "dark",
    });
    expect(readAppearancePreferences(storage)).toEqual({
      themeMode: "dark",
    });
  });
});
