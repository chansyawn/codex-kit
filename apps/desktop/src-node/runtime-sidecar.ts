import { mkdir, rm, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const DEFAULT_HOST = "127.0.0.1";

type RuntimeApp = {
  fetch: (request: Request) => Promise<Response> | Response;
};

type RuntimeModule = {
  createRuntimeApp?: (options: {
    codexHome: string;
    startedAt?: number;
    staticRoot?: string;
    version: string;
  }) => RuntimeApp;
  default?: RuntimeApp;
};

type SidecarOptions = {
  clientPath: string;
  codexHome: string;
  serverPath: string;
  stateFile: string;
  version: string;
};

type RuntimeState = {
  host: string;
  pid: number;
  port: number;
  startedAt: string;
};

const options = parseOptions(process.argv.slice(2));
const startedAt = Date.now();
const app = await createRuntimeApp(options, startedAt);
const server = createServer((request, response) => {
  void handleRequest(app, request, response);
});

server.listen(0, DEFAULT_HOST, () => {
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("CodexKit runtime did not receive a TCP address.");
  }

  const state: RuntimeState = {
    host: DEFAULT_HOST,
    pid: process.pid,
    port: address.port,
    startedAt: new Date(startedAt).toISOString(),
  };

  void writeRuntimeState(options.stateFile, state);
});

process.once("SIGINT", close);
process.once("SIGTERM", close);

function parseOptions(args: string[]): SidecarOptions {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];

    if (!key?.startsWith("--") || !value) {
      throw new Error(`Invalid CodexKit sidecar argument near ${key ?? "<end>"}.`);
    }

    values.set(key.slice(2), value);
  }

  return {
    clientPath: requireOption(values, "client"),
    codexHome: requireOption(values, "codex-home"),
    serverPath: requireOption(values, "server"),
    stateFile: requireOption(values, "state-file"),
    version: requireOption(values, "version"),
  };
}

function requireOption(values: Map<string, string>, key: string): string {
  const value = values.get(key);

  if (!value) {
    throw new Error(`Missing CodexKit sidecar option --${key}.`);
  }

  return value;
}

async function createRuntimeApp(options: SidecarOptions, startedAt: number): Promise<RuntimeApp> {
  process.env.CODEXKIT_CODEX_HOME = options.codexHome;
  process.env.CODEXKIT_STARTED_AT = String(startedAt);
  process.env.CODEXKIT_STATIC_ROOT = options.clientPath;
  process.env.CODEXKIT_VERSION = options.version;

  const runtimeModule = (await import(pathToFileURL(options.serverPath).href)) as RuntimeModule;
  const app =
    runtimeModule.createRuntimeApp?.({
      codexHome: options.codexHome,
      startedAt,
      staticRoot: options.clientPath,
      version: options.version,
    }) ?? runtimeModule.default;

  if (!app) {
    throw new Error("CodexKit runtime server module did not export a Hono app.");
  }

  return app;
}

async function handleRequest(
  app: RuntimeApp,
  incomingRequest: IncomingMessage,
  outgoingResponse: ServerResponse,
): Promise<void> {
  try {
    const runtimeResponse = await app.fetch(createFetchRequest(incomingRequest));
    await writeResponse(outgoingResponse, runtimeResponse);
  } catch (error) {
    console.error(error);
    outgoingResponse.statusCode = 500;
    outgoingResponse.end("Internal Server Error");
  }
}

function createFetchRequest(incomingRequest: IncomingMessage): Request {
  const host = incomingRequest.headers.host ?? DEFAULT_HOST;
  const url = new URL(incomingRequest.url ?? "/", `http://${host}`);
  const headers = new Headers();

  for (const [key, value] of Object.entries(incomingRequest.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    } else if (value) {
      headers.set(key, value);
    }
  }

  const method = incomingRequest.method ?? "GET";
  const init: RequestInit & { duplex?: "half" } = {
    headers,
    method,
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = Readable.toWeb(incomingRequest) as ReadableStream<Uint8Array>;
    init.duplex = "half";
  }

  return new Request(url, init);
}

async function writeResponse(
  outgoingResponse: ServerResponse,
  runtimeResponse: Response,
): Promise<void> {
  outgoingResponse.statusCode = runtimeResponse.status;
  outgoingResponse.statusMessage = runtimeResponse.statusText;
  runtimeResponse.headers.forEach((value, key) => {
    outgoingResponse.setHeader(key, value);
  });

  if (!runtimeResponse.body) {
    outgoingResponse.end();
    return;
  }

  const reader = runtimeResponse.body.getReader();

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) {
        break;
      }

      outgoingResponse.write(Buffer.from(chunk.value));
    }
  } finally {
    outgoingResponse.end();
    reader.releaseLock();
  }
}

async function writeRuntimeState(path: string, state: RuntimeState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
}

function close(): void {
  server.close(() => {
    void rm(options.stateFile, { force: true }).finally(() => {
      process.exit(0);
    });
  });
}
