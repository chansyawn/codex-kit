import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      check: {
        command: "node --experimental-strip-types ./scripts/generate-protocol.ts --check",
        env: ["CODEX_BIN"],
      },
      generate: {
        command: "node --experimental-strip-types ./scripts/generate-protocol.ts",
        env: ["CODEX_BIN"],
      },
    },
  },
});
