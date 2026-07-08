import { defineConfig } from "vite-plus";

const ignorePatterns = [
  "apps/runtime/src/routeTree.gen.ts",
  "packages/app-server-protocol/schemas/**",
  "packages/app-server-protocol/src/generated/**",
];

export default defineConfig({
  staged: {
    "*": "vp check --fix",
    "apps/desktop/src-tauri/**/*.rs": () =>
      "cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml",
  },
  fmt: {
    ignorePatterns,
    sortImports: true,
    sortTailwindcss: true,
  },
  lint: {
    ignorePatterns,
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
