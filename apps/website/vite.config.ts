import { fileURLToPath } from "node:url";

import { lingui } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
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
      plugins: ["@lingui/babel-plugin-lingui-macro"],
    }),
    react(),
    tailwindcss(),
    lingui(),
  ],
  test: {
    environment: "jsdom",
  },
});
