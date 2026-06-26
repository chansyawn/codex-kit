import { createRuntimeApp } from "./app.ts";

export { createRuntimeApp };
export type { RuntimeAppOptions } from "./app.ts";

export default createRuntimeApp({
  codexHome:
    process.env.CODEXKIT_CODEX_HOME ?? process.env.CODEX_HOME ?? `${process.env.HOME ?? ""}/.codex`,
  startedAt: Number(process.env.CODEXKIT_STARTED_AT ?? Date.now()),
  staticRoot: process.env.CODEXKIT_STATIC_ROOT,
  version: process.env.CODEXKIT_VERSION ?? "0.0.0",
});
