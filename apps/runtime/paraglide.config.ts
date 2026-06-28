import { fileURLToPath } from "node:url";

import type { CompilerOptions } from "@inlang/paraglide-js";

export const runtimeRoot = fileURLToPath(new URL(".", import.meta.url));

export const paraglideConfig = {
  emitTsDeclarations: true,
  isServer: "import.meta.env.SSR",
  outdir: fileURLToPath(new URL("./src/locales/paraglide", import.meta.url)),
  project: fileURLToPath(new URL("./project.inlang", import.meta.url)),
  strategy: ["preferredLanguage", "baseLocale"],
} satisfies CompilerOptions;
