import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
    "apps/desktop/src-tauri/**/*.rs": () =>
      "cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml",
  },
  fmt: {
    ignorePatterns: ["apps/runtime/src/routeTree.gen.ts"],
    sortImports: true,
    sortTailwindcss: true,
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
  run: {
    cache: true,
  },
});
