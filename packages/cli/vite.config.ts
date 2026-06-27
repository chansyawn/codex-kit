import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    copy: [
      {
        from: "../../apps/runtime/dist/server",
        to: "runtime",
      },
      {
        from: "../../apps/runtime/dist/client",
        to: "runtime",
      },
    ],
    deps: {
      skipNodeModulesBundle: true,
    },
    dts: false,
    entry: {
      cli: "./src/cli.ts",
    },
    exports: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
