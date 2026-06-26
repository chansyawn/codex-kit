import { fileURLToPath } from "node:url";

import build from "@hono/vite-build";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { type ConfigEnv, defineConfig, lazyPlugins } from "vite-plus";

const commonConfig = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
  },
};

export default defineConfig(({ mode }: ConfigEnv) => {
  if (mode === "server") {
    return {
      ...commonConfig,
      build: {
        copyPublicDir: false,
      },
      plugins: lazyPlugins(() => [
        build({
          entry: "./src/server/entry.ts",
          output: "index.js",
          outputDir: "./dist/server",
          ssrTarget: "node",
        }),
      ]),
    };
  }

  return {
    ...commonConfig,
    build: {
      outDir: "dist/client",
    },
    plugins: lazyPlugins(async () => [
      devServer({
        entry: "./src/server/entry.ts",
        exclude: [/.*\.[a-zA-Z0-9]+(?:\?.*)?$/, ...defaultOptions.exclude],
        injectClientScript: false,
        adapter: nodeAdapter(),
      }),
      tanstackRouter({ target: "react" }),
      react(),
      tailwindcss(),
    ]),
  };
});
