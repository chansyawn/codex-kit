#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { serve } from "@hono/node-server";
import { cac } from "cac";

const DEFAULT_HOST = "127.0.0.1";
const SYSTEM_ASSIGNED_PORT = 0;
const VERSION = "0.0.0";
const STATE_FILE_NAME = "codexkit-runtime.json";
const ENSURE_TIMEOUT_MS = 8_000;

type RuntimeState = {
  host: string;
  pid: number;
  port: number;
  startedAt: string;
};

type RuntimeAppModule = {
  createRuntimeApp?: (options: {
    codexHome: string;
    startedAt?: number;
    staticRoot?: string;
    version: string;
  }) => {
    fetch: (request: Request) => Response | Promise<Response>;
  };
  default?: {
    fetch: (request: Request) => Response | Promise<Response>;
  };
};

function getCodexHome(): string {
  return process.env.CODEX_HOME ?? `${process.env.HOME ?? ""}/.codex`;
}

function getStatePath(codexHome: string): string {
  return join(codexHome, STATE_FILE_NAME);
}

function createDashboardUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

async function startServer(): Promise<void> {
  const codexHome = getCodexHome();
  const startedAt = Date.now();
  const staticRoot = resolveRuntimePath("client");
  process.env.CODEXKIT_CODEX_HOME = codexHome;
  process.env.CODEXKIT_STARTED_AT = String(startedAt);
  process.env.CODEXKIT_STATIC_ROOT = staticRoot;
  process.env.CODEXKIT_VERSION = VERSION;
  const runtimeModule = await importRuntimeAppModule();
  const app =
    runtimeModule.createRuntimeApp?.({
      codexHome,
      startedAt,
      staticRoot,
      version: VERSION,
    }) ?? runtimeModule.default;

  if (!app) {
    throw new Error("CodexKit runtime server module did not export a Hono app.");
  }

  const server = serve(
    {
      fetch: app.fetch,
      hostname: DEFAULT_HOST,
      port: SYSTEM_ASSIGNED_PORT,
    },
    (address) => {
      const state: RuntimeState = {
        host: DEFAULT_HOST,
        pid: process.pid,
        port: address.port,
        startedAt: new Date(startedAt).toISOString(),
      };

      void writeRuntimeState(codexHome, state);
    },
  );

  const close = () => {
    server.close(() => {
      void removeRuntimeState(codexHome);
      process.exit(0);
    });
  };

  process.once("SIGINT", close);
  process.once("SIGTERM", close);

  await waitForShutdown();
}

async function ensureServer(): Promise<RuntimeState> {
  const codexHome = getCodexHome();
  const existingState = await readRuntimeState(codexHome);

  if (existingState && (await isRuntimeHealthy(existingState))) {
    return existingState;
  }

  if (existingState) {
    await removeRuntimeState(codexHome);
  }

  startBackgroundServer();

  return waitForRuntimeState(codexHome);
}

async function openDashboard(): Promise<void> {
  const state = await ensureServer();

  console.log(createDashboardUrl(state.host, state.port));
}

async function stopServer(): Promise<void> {
  const codexHome = getCodexHome();
  const state = await readRuntimeState(codexHome);

  if (!state) {
    console.log("CodexKit runtime is not running.");
    return;
  }

  if (isPidAlive(state.pid)) {
    process.kill(state.pid, "SIGTERM");
  }

  await removeRuntimeState(codexHome);
  console.log("CodexKit runtime stopped.");
}

async function main(): Promise<void> {
  if (process.argv.includes("--serve")) {
    await startServer();
    return;
  }

  const cli = cac("codexkit");

  cli.command("open", "Print the dashboard URL").action(openDashboard);
  cli.command("stop", "Stop the local CodexKit runtime server").action(stopServer);

  cli.help();
  cli.version(VERSION);
  cli.parse();
}

async function importRuntimeAppModule(): Promise<RuntimeAppModule> {
  const moduleUrl = pathToFileURL(resolveRuntimePath("server/index.js")).href;

  return import(moduleUrl) as Promise<RuntimeAppModule>;
}

function resolveRuntimePath(...segments: string[]): string {
  return fileURLToPath(new URL(`./runtime/${segments.join("/")}`, import.meta.url));
}

async function writeRuntimeState(codexHome: string, state: RuntimeState): Promise<void> {
  await mkdir(codexHome, { recursive: true });
  await writeFile(getStatePath(codexHome), `${JSON.stringify(state, null, 2)}\n`);
}

async function readRuntimeState(codexHome: string): Promise<RuntimeState | null> {
  try {
    return JSON.parse(await readFile(getStatePath(codexHome), "utf8")) as RuntimeState;
  } catch {
    return null;
  }
}

async function removeRuntimeState(codexHome: string): Promise<void> {
  await rm(getStatePath(codexHome), { force: true });
}

function startBackgroundServer(): void {
  const child = spawn(
    process.execPath,
    [process.argv[1] ?? fileURLToPath(import.meta.url), "--serve"],
    {
      detached: true,
      env: process.env,
      stdio: "ignore",
    },
  );

  child.unref();
}

async function waitForRuntimeState(codexHome: string): Promise<RuntimeState> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < ENSURE_TIMEOUT_MS) {
    const state = await readRuntimeState(codexHome);

    if (state && (await isRuntimeHealthy(state))) {
      return state;
    }

    await new Promise((resolvePromise) => {
      setTimeout(resolvePromise, 100);
    });
  }

  throw new Error("Timed out waiting for CodexKit runtime to start.");
}

async function isRuntimeHealthy(state: RuntimeState): Promise<boolean> {
  if (!isPidAlive(state.pid)) {
    return false;
  }

  try {
    const response = await fetch(`${createDashboardUrl(state.host, state.port)}/api/health`);
    await response.arrayBuffer();

    return response.ok;
  } catch {
    return false;
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function waitForShutdown(): Promise<never> {
  const keepAlive = setInterval(() => {}, 60_000);

  process.once("exit", () => {
    clearInterval(keepAlive);
  });

  return new Promise<never>(() => {
    // Keep the process alive until an explicit signal closes the server.
  });
}

void main();
