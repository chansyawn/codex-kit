import { fileURLToPath } from "node:url";

import type { CompilerOptions } from "@inlang/paraglide-js";

export const runtimeRoot = fileURLToPath(new URL(".", import.meta.url));

export const paraglideConfig = {
  emitTsDeclarations: true,
  isServer: "import.meta.env.SSR",
  localStorageKey: "codex-kit.codexkit.locale.v1",
  outdir: fileURLToPath(new URL("./src/paraglide", import.meta.url)),
  project: fileURLToPath(new URL("./project.inlang", import.meta.url)),
  strategy: ["localStorage", "preferredLanguage", "baseLocale"],
} satisfies CompilerOptions;
