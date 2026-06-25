#!/usr/bin/env node
import { serve } from "@hono/node-server";
import { cac } from "cac";

import { createRuntimeApp } from "./server.ts";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 43188;
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
    port: Number(options.port ?? DEFAULT_PORT),
  };
}

function createDashboardUrl(options: ServerOptions = {}): string {
  const normalizedOptions = normalizeServerOptions(options);

  return `http://${normalizedOptions.host}:${normalizedOptions.port}`;
}

async function startServer(options: ServerOptions = {}): Promise<void> {
  const normalizedOptions = normalizeServerOptions(options);
  const app = createRuntimeApp({
    codexHome: getCodexHome(),
    version: VERSION,
  });

  serve({
    fetch: app.fetch,
    hostname: normalizedOptions.host,
    port: normalizedOptions.port,
  });

  console.log(`CodexKit runtime listening on ${createDashboardUrl(normalizedOptions)}`);
}

async function ensureServer(options: ServerOptions = {}): Promise<void> {
  console.log(`CodexKit runtime should be available at ${createDashboardUrl(options)}`);
}

async function handleSessionStart(options: ServerOptions = {}): Promise<void> {
  await ensureServer(options);
  console.log(`Open CodexKit dashboard: ${createDashboardUrl(options)}`);
}

const cli = cac("codexkit");

cli
  .command("server <action>", "Manage the local CodexKit runtime server")
  .option("--host <host>", "Host to bind", { default: DEFAULT_HOST })
  .option("--port <port>", "Port to bind", { default: DEFAULT_PORT })
  .action(async (action: ServerAction, options: ServerOptions) => {
    if (action === "start") {
      await startServer(options);
      return;
    }

    if (action === "ensure") {
      await ensureServer(options);
      return;
    }

    throw new Error(`Unknown server action: ${action}`);
  });

cli
  .command("hook <name>", "Handle Codex plugin hooks")
  .option("--host <host>", "Runtime host", { default: DEFAULT_HOST })
  .option("--port <port>", "Runtime port", { default: DEFAULT_PORT })
  .action(async (name: HookAction, options: ServerOptions) => {
    if (name === "session-start") {
      await handleSessionStart(options);
      return;
    }

    throw new Error(`Unknown hook: ${name}`);
  });

cli.command("open", "Print the dashboard URL").action(() => {
  console.log(createDashboardUrl());
});

cli.command("doctor", "Print CodexKit environment diagnostics").action(() => {
  console.log(`Codex home: ${getCodexHome()}`);
  console.log(`Dashboard URL: ${createDashboardUrl()}`);
});

cli.command("stop", "Stop the local CodexKit runtime server").action(() => {
  console.log("Stop is not implemented in this architecture skeleton.");
});

cli.help();
cli.version(VERSION);
cli.parse();
