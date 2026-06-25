#!/usr/bin/env node
import type { AddressInfo } from "node:net";

import { serve } from "@hono/node-server";
import { cac } from "cac";

import { createRuntimeApp } from "./server.ts";

const DEFAULT_HOST = "127.0.0.1";
const SYSTEM_ASSIGNED_PORT = 0;
const VERSION = "0.0.0";

type ServerOptions = {
  host?: string;
  port?: number | string;
};

type ServerAction = "ensure" | "start";
type HookAction = "session-start";

function getCodexHome(): string {
  return process.env.CODEX_HOME ?? `${process.env.HOME ?? ""}/.codex`;
}

function normalizeServerOptions(options: ServerOptions) {
  return {
    host: options.host ?? DEFAULT_HOST,
    port: Number(options.port ?? SYSTEM_ASSIGNED_PORT),
  };
}

function createDashboardUrl(host: string, port: number): string {
  return `http://${host}:${port}`;
}

function createRuntimePortMessage(): string {
  return "CodexKit runtime uses a system-assigned port. Run `codexkit server start` to print the dashboard URL.";
}

async function startServer(options: ServerOptions = {}): Promise<void> {
  const normalizedOptions = normalizeServerOptions(options);
  const app = createRuntimeApp({
    codexHome: getCodexHome(),
    version: VERSION,
  });

  serve(
    {
      fetch: app.fetch,
      hostname: normalizedOptions.host,
      port: normalizedOptions.port,
    },
    (address) => {
      console.log(`CodexKit runtime listening on ${createDashboardUrlFromAddress(address)}`);
    },
  );
}

async function ensureServer(options: ServerOptions = {}): Promise<void> {
  const normalizedOptions = normalizeServerOptions(options);

  if (normalizedOptions.port === SYSTEM_ASSIGNED_PORT) {
    console.log(createRuntimePortMessage());
    return;
  }

  console.log(
    `CodexKit runtime should be available at ${createDashboardUrl(
      normalizedOptions.host,
      normalizedOptions.port,
    )}`,
  );
}

async function handleSessionStart(options: ServerOptions = {}): Promise<void> {
  await ensureServer(options);
}

const cli = cac("codexkit");

cli
  .command("server <action>", "Manage the local CodexKit runtime server")
  .option("--host <host>", "Host to bind", { default: DEFAULT_HOST })
  .option("--port <port>", "Port to bind. Omit it to let the system assign one.")
  .action(async (action: ServerAction, options: ServerOptions) => {
    if (action === "start") {
      await startServer(options);
      return;
    }

    if (action === "ensure") {
      await ensureServer(options);
      return;
    }

    throw new Error("Unknown server action.");
  });

cli
  .command("hook <name>", "Handle Codex plugin hooks")
  .option("--host <host>", "Runtime host", { default: DEFAULT_HOST })
  .option("--port <port>", "Runtime port. Omit it to let the system assign one.")
  .action(async (name: HookAction, options: ServerOptions) => {
    if (name === "session-start") {
      await handleSessionStart(options);
      return;
    }

    throw new Error("Unknown hook.");
  });

cli.command("open", "Print the dashboard URL").action(() => {
  console.log(createRuntimePortMessage());
});

cli.command("doctor", "Print CodexKit environment diagnostics").action(() => {
  console.log(`Codex home: ${getCodexHome()}`);
  console.log(createRuntimePortMessage());
});

cli.command("stop", "Stop the local CodexKit runtime server").action(() => {
  console.log("Stop is not implemented in this architecture skeleton.");
});

cli.help();
cli.version(VERSION);
cli.parse();

function createDashboardUrlFromAddress(address: AddressInfo): string {
  return createDashboardUrl(address.address, address.port);
}
