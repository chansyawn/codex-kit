import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    deps: {
      skipNodeModulesBundle: true,
    },
    dts: {
      tsgo: true,
    },
    entry: {
      cli: "./src/cli.ts",
      "dev-server": "./src/dev-server.ts",
      index: "./src/index.ts",
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
