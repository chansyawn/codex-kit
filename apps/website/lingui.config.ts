import { defineConfig } from "@lingui/cli";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en", "zh-Hans", "pseudo"],
  pseudoLocale: "pseudo",
  fallbackLocales: { default: "en" },
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
  compileNamespace: "ts",
  orderBy: "messageId",
});
