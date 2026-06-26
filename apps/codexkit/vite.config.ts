import { fileURLToPath } from "node:url";

import build from "@hono/vite-build";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { type ConfigEnv, defineConfig, lazyPlugins, type PluginOption } from "vite-plus";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const linguiConfigPath = fileURLToPath(new URL("./lingui.config.ts", import.meta.url));
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
      // @rolldown/plugin-babel returns rolldown's Plugin, which is nominally
      // incompatible with vite-plus's PluginOption (same shape, different origin).
      // Without the cast, TS blows the stack on the deep type comparison.
      (await babel({
        cwd: appRoot,
        presets: [
          linguiTransformerBabelPreset(undefined, {
            configPath: linguiConfigPath,
            cwd: appRoot,
          }),
        ],
      })) as PluginOption,
      react(),
      tailwindcss(),
      lingui({ configPath: linguiConfigPath, cwd: appRoot }),
    ]),
  };
});
