import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: false,
    entry: {
      "runtime-sidecar": "./src-node/runtime-sidecar.ts",
    },
    exports: false,
    format: ["cjs"],
    outDir: "dist-node",
    platform: "node",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
