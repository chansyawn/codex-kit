import { fileURLToPath } from "node:url";

import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const linguiConfigPath = fileURLToPath(new URL("./lingui.config.ts", import.meta.url));

export default defineConfig({
  server: {
    proxy: process.env.CODEXKIT_RUNTIME_URL
      ? {
          "/api": process.env.CODEXKIT_RUNTIME_URL,
        }
      : undefined,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
    }),
    babel({
      cwd: appRoot,
      presets: [
        linguiTransformerBabelPreset(undefined, {
          configPath: linguiConfigPath,
          cwd: appRoot,
        }),
      ],
    }),
    react(),
    tailwindcss(),
    lingui({
      configPath: linguiConfigPath,
      cwd: appRoot,
    }),
  ],
  test: {
    environment: "jsdom",
  },
});
