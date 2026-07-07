import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface, type Interface } from "node:readline";

import type { SessionDetailResponse } from "./model";

export type AppServerTransport = {
  close: () => void;
  getStderr: () => string;
  readLine: () => Promise<string>;
  send: (message: AppServerClientMessage) => void;
};

export type AppServerTransportFactory = (
  options: AppServerStdioTransportOptions,
) => AppServerTransport;

export type AppServerStdioTransportOptions = {
  codexBin: string;
  codexHome: string;
};

export type ReadSessionDetailFromAppServerOptions = {
  codexBin?: string;
  codexHome: string;
  createTransport?: AppServerTransportFactory;
  sessionId: string;
  timeoutMs?: number;
  version: string;
};

export type AppServerRequest = {
  id: number;
  method: string;
  params: unknown;
};

export type AppServerNotification = {
  method: string;
  params: unknown;
};

export type AppServerClientMessage = AppServerNotification | AppServerRequest;

type PendingLineReader = {
  reject: (error: Error) => void;
  resolve: (line: string) => void;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const STDERR_LIMIT = 4_000;

export class AppServerClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppServerClientError";
  }
}

export async function readSessionDetailFromAppServer(
  options: ReadSessionDetailFromAppServerOptions,
): Promise<SessionDetailResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const transport = (options.createTransport ?? createStdioAppServerTransport)({
    codexBin: options.codexBin ?? process.env.CODEXKIT_CODEX_BIN ?? "codex",
    codexHome: options.codexHome,
  });
  const client = new JsonRpcClient(transport, timeoutMs);

  try {
    await client.request("initialize", {
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
      },
      clientInfo: {
        name: "codexkit_runtime",
        title: "CodexKit Runtime",
        version: options.version,
      },
    });
    client.notify("initialized", {});

    const response = await client.request("thread/read", {
      includeTurns: true,
      threadId: options.sessionId,
    });

    if (!isSessionDetailResponse(response)) {
      throw new AppServerClientError("App server returned an invalid thread/read response.");
    }

    return response;
  } catch (error) {
    throw createClientError(error, transport.getStderr());
  } finally {
    transport.close();
  }
}

export function createStdioAppServerTransport(
  options: AppServerStdioTransportOptions,
): AppServerTransport {
  const child = spawn(options.codexBin, ["app-server"], {
    env: {
      ...process.env,
      CODEX_HOME: options.codexHome,
      CODEXKIT_CODEX_HOME: options.codexHome,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  return new StdioAppServerTransport(child);
}

class JsonRpcClient {
  private nextId = 1;
  private readonly timeoutMs: number;
  private readonly transport: AppServerTransport;

  constructor(transport: AppServerTransport, timeoutMs: number) {
    this.transport = transport;
    this.timeoutMs = timeoutMs;
  }

  notify(method: string, params: unknown): void {
    this.transport.send({ method, params });
  }

  async request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;
    this.transport.send({ id, method, params });

    return withTimeout(this.readResponse(id, method), this.timeoutMs, method);
  }

  private async readResponse(id: number, method: string): Promise<unknown> {
    while (true) {
      const line = (await this.transport.readLine()).trim();
      if (!line) continue;

      const message = parseIncomingMessage(line);
      if (!("id" in message) || message.id !== id) continue;

      if ("error" in message && message.error) {
        throw new AppServerClientError(formatJsonRpcError(method, message.error));
      }

      return "result" in message ? message.result : undefined;
    }
  }
}

class StdioAppServerTransport implements AppServerTransport {
  private readonly child: ChildProcessWithoutNullStreams;
  private readonly lines: string[] = [];
  private readonly readers: PendingLineReader[] = [];
  private readonly readline: Interface;
  private closedError: Error | undefined;
  private stderr = "";

  constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child;
    this.readline = createInterface({ input: child.stdout });

    this.readline.on("line", (line) => {
      const reader = this.readers.shift();

      if (reader) {
        reader.resolve(line);
      } else {
        this.lines.push(line);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      this.stderr = `${this.stderr}${chunk.toString("utf8")}`.slice(-STDERR_LIMIT);
    });
    child.once("error", (error) => {
      this.fail(error instanceof Error ? error : new Error(String(error)));
    });
    child.once("exit", (code, signal) => {
      this.fail(
        new AppServerClientError(
          `App server exited before responding (code=${String(code)}, signal=${String(signal)}).`,
        ),
      );
    });
  }

  send(message: AppServerClientMessage): void {
    if (this.closedError) throw this.closedError;

    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  readLine(): Promise<string> {
    const line = this.lines.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.closedError) return Promise.reject(this.closedError);

    return new Promise((resolve, reject) => {
      this.readers.push({ reject, resolve });
    });
  }

  close(): void {
    this.readline.close();
    this.fail(new AppServerClientError("App server transport closed."));

    try {
      this.child.stdin.end();
    } catch {
      // The process may already have closed stdin after a failed handshake.
    }

    if (!this.child.killed) {
      this.child.kill();
    }
  }

  getStderr(): string {
    return this.stderr.trim();
  }

  private fail(error: Error): void {
    if (!this.closedError) this.closedError = error;

    while (this.readers.length > 0) {
      this.readers.shift()?.reject(error);
    }
  }
}

function parseIncomingMessage(line: string): Record<string, unknown> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(line) as unknown;
  } catch (error) {
    const suffix = error instanceof Error ? ` (${error.message})` : "";

    throw new AppServerClientError(`App server emitted malformed JSON: ${line}${suffix}`);
  }

  if (!isRecord(parsed)) {
    throw new AppServerClientError("App server emitted a non-object JSON-RPC message.");
  }

  return parsed;
}

function formatJsonRpcError(method: string, error: unknown): string {
  if (!isRecord(error)) return `App server ${method} request failed.`;

  const message = typeof error.message === "string" ? error.message : "Unknown error";
  const code =
    typeof error.code === "number" || typeof error.code === "string" ? ` (${error.code})` : "";

  return `App server ${method} request failed${code}: ${message}`;
}

function withTimeout<TValue>(
  promise: Promise<TValue>,
  timeoutMs: number,
  method: string,
): Promise<TValue> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new AppServerClientError(`App server ${method} request timed out.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
}

function createClientError(error: unknown, stderr: string): AppServerClientError {
  const message = error instanceof Error ? error.message : String(error);
  const suffix = stderr ? `\napp-server stderr:\n${stderr}` : "";

  return new AppServerClientError(`${message}${suffix}`);
}

function isSessionDetailResponse(value: unknown): value is SessionDetailResponse {
  if (!isRecord(value) || !isRecord(value.thread)) return false;

  return typeof value.thread.id === "string" && Array.isArray(value.thread.turns);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
