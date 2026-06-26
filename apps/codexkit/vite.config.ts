import { fileURLToPath } from "node:url";

import build from "@hono/vite-build";
import devServer, { defaultOptions } from "@hono/vite-dev-server";
import nodeAdapter from "@hono/vite-dev-server/node";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import type { ConfigEnv } from "vite-plus";

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

export default async function createConfig({ mode }: ConfigEnv) {
  const babelPlugin = await babel({
    cwd: appRoot,
    presets: [
      linguiTransformerBabelPreset(undefined, {
        configPath: linguiConfigPath,
        cwd: appRoot,
      }),
    ],
  });

  if (mode === "server") {
    const serverPlugins: unknown[] = [
      toVitePlugin(
        build({
          entry: "./src/server/entry.ts",
          output: "index.js",
          outputDir: "./dist/server",
          ssrTarget: "node",
        }),
      ),
    ];

    return {
      ...commonConfig,
      build: {
        copyPublicDir: false,
      },
      plugins: serverPlugins,
    };
  }

  const clientPlugins: unknown[] = [
    toVitePlugin(
      devServer({
        entry: "./src/server/entry.ts",
        exclude: [/.*\.[a-zA-Z0-9]+(?:\?.*)?$/, ...defaultOptions.exclude],
        injectClientScript: false,
        adapter: nodeAdapter(),
      }),
    ),
    toVitePlugin(
      tanstackRouter({
        target: "react",
      }),
    ),
    toVitePlugin(babelPlugin),
    toVitePlugin(react()),
    toVitePlugin(tailwindcss()),
    toVitePlugin(
      lingui({
        configPath: linguiConfigPath,
        cwd: appRoot,
      }),
    ),
  ];

  return {
    ...commonConfig,
    build: {
      outDir: "dist/client",
    },
    plugins: clientPlugins,
  };
}

function toVitePlugin(plugin: unknown): unknown {
  return plugin;
}
