import { fileURLToPath } from "node:url";

import build from "@hono/vite-build";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { type ConfigEnv, defineConfig, lazyPlugins, type PluginOption } from "vite-plus";

import { paraglideConfig, runtimeRoot } from "./paraglide.config.ts";

const commonConfig = {
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  root: runtimeRoot,
  test: {
    environment: "jsdom",
  },
};

function createServerPlugins(): PluginOption[] {
  return [
    build({
      entry: "./src/server/entry.ts",
      output: "index.js",
      outputDir: "./dist/server",
      ssrTarget: "node",
    }) as PluginOption,
  ];
}

async function createClientPlugins(): Promise<PluginOption[]> {
  return [
    devServer({
      entry: "./src/server/entry.ts",
      exclude: [/^[^?]*\.[a-zA-Z0-9]+(?:\?.*)?$/, ...defaultOptions.exclude],
      injectClientScript: false,
      adapter: nodeAdapter(),
    }) as PluginOption,
    tanstackRouter({ target: "react" }) as PluginOption,
    paraglideVitePlugin(paraglideConfig) as PluginOption,
    react() as PluginOption,
    tailwindcss() as PluginOption,
  ];
}

export default defineConfig(({ mode }: ConfigEnv) => {
  if (mode === "server") {
    return {
      ...commonConfig,
      build: {
        copyPublicDir: false,
      },
      plugins: lazyPlugins(createServerPlugins),
    };
  }

  return {
    ...commonConfig,
    server: {
      port: 31542,
      strictPort: true,
    },
    build: {
      outDir: "dist/client",
    },
    plugins: lazyPlugins(createClientPlugins),
  };
});
