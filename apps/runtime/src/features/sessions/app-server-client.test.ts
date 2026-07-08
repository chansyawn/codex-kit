import type { ClientRequest } from "@codexkit/app-server-protocol";
import type { Thread, ThreadReadResponse } from "@codexkit/app-server-protocol/v2";
import { describe, expect, it } from "vite-plus/test";

import {
  type AppServerClientMessage,
  type AppServerTransport,
  readSessionDetailFromAppServer,
} from "./app-server-client";

describe("app-server session detail client", () => {
  it("initializes the connection, reads a thread, ignores notifications, and closes", async () => {
    const transport = new FakeTransport((message, fake) => {
      if (isRequest(message) && message.method === "initialize") {
        fake.enqueue({ id: message.id, result: { platformFamily: "unix" } });
      }

      if (isRequest(message) && message.method === "thread/read") {
        fake.enqueue({ method: "thread/status/changed", params: { threadId: "thread-a" } });
        fake.enqueue({ id: message.id, result: createDetailResponse() });
      }
    });

    const response = await readSessionDetailFromAppServer({
      codexHome: "/tmp/codex-home",
      createTransport: () => transport,
      sessionId: "thread-a",
      version: "test",
    });

    expect(response.thread.id).toBe("thread-a");
    expect(transport.closed).toBe(true);
    expect(transport.sent.map((message) => message.method)).toEqual([
      "initialize",
      "initialized",
      "thread/read",
    ]);
    expect(getRequest(transport.sent[0])?.params).toMatchObject({
      capabilities: {
        experimentalApi: true,
        requestAttestation: false,
      },
      clientInfo: {
        name: "codexkit_runtime",
        title: "CodexKit Runtime",
        version: "test",
      },
    });
    expect(getRequest(transport.sent[2])?.params).toEqual({
      includeTurns: true,
      threadId: "thread-a",
    });
  });

  it("rejects JSON-RPC errors and closes the transport", async () => {
    const transport = new FakeTransport((message, fake) => {
      if (isRequest(message) && message.method === "initialize") {
        fake.enqueue({ id: message.id, result: {} });
      }

      if (isRequest(message) && message.method === "thread/read") {
        fake.enqueue({
          error: { code: -32000, message: "missing thread" },
          id: message.id,
        });
      }
    });

    await expect(
      readSessionDetailFromAppServer({
        codexHome: "/tmp/codex-home",
        createTransport: () => transport,
        sessionId: "missing",
        version: "test",
      }),
    ).rejects.toThrow("missing thread");
    expect(transport.closed).toBe(true);
  });

  it("rejects malformed JSON and closes the transport", async () => {
    const transport = new FakeTransport((message, fake) => {
      if (isRequest(message) && message.method === "initialize") {
        fake.enqueue("{not-json");
      }
    });

    await expect(
      readSessionDetailFromAppServer({
        codexHome: "/tmp/codex-home",
        createTransport: () => transport,
        sessionId: "thread-a",
        version: "test",
      }),
    ).rejects.toThrow("malformed JSON");
    expect(transport.closed).toBe(true);
  });

  it("rejects transport exits before a response and includes stderr", async () => {
    const transport = new FakeTransport();
    transport.stderr = "startup failed";
    transport.readError = new Error("process closed");

    await expect(
      readSessionDetailFromAppServer({
        codexHome: "/tmp/codex-home",
        createTransport: () => transport,
        sessionId: "thread-a",
        version: "test",
      }),
    ).rejects.toThrow("startup failed");
    expect(transport.closed).toBe(true);
  });

  it("rejects timeouts and closes the transport", async () => {
    const transport = new FakeTransport();
    transport.neverResolveReads = true;

    await expect(
      readSessionDetailFromAppServer({
        codexHome: "/tmp/codex-home",
        createTransport: () => transport,
        sessionId: "thread-a",
        timeoutMs: 1,
        version: "test",
      }),
    ).rejects.toThrow("timed out");
    expect(transport.closed).toBe(true);
  });
});

class FakeTransport implements AppServerTransport {
  closed = false;
  neverResolveReads = false;
  readError: Error | undefined;
  sent: AppServerClientMessage[] = [];
  stderr = "";

  private readonly lines: string[] = [];
  private readonly onSend:
    | ((message: AppServerClientMessage, transport: FakeTransport) => void)
    | undefined;

  constructor(onSend?: (message: AppServerClientMessage, transport: FakeTransport) => void) {
    this.onSend = onSend;
  }

  close(): void {
    this.closed = true;
  }

  enqueue(message: unknown): void {
    this.lines.push(typeof message === "string" ? message : JSON.stringify(message));
  }

  getStderr(): string {
    return this.stderr;
  }

  readLine(): Promise<string> {
    if (this.readError) return Promise.reject(this.readError);

    const line = this.lines.shift();
    if (line !== undefined) return Promise.resolve(line);
    if (this.neverResolveReads) return new Promise<string>(() => {});

    return Promise.reject(new Error("No fake app-server response queued."));
  }

  send(message: AppServerClientMessage): void {
    this.sent.push(message);
    this.onSend?.(message, this);
  }
}

function getRequest(message: AppServerClientMessage | undefined) {
  return message && isRequest(message) ? message : undefined;
}

function isRequest(message: AppServerClientMessage): message is ClientRequest {
  return "id" in message;
}

function createDetailResponse(): ThreadReadResponse {
  return {
    thread: createThread(),
  };
}

function createThread(): Thread {
  return {
    agentNickname: null,
    agentRole: null,
    cliVersion: "0.142.5",
    createdAt: 1_783_000_000,
    cwd: "/workspace/project",
    ephemeral: false,
    forkedFromId: null,
    gitInfo: {
      branch: "main",
      originUrl: "https://github.com/example/repo",
      sha: "abc123",
    },
    id: "thread-a",
    modelProvider: "openai",
    name: "Build detail page",
    parentThreadId: null,
    path: "/tmp/rollout.jsonl",
    preview: "Build detail page",
    recencyAt: 1_783_000_100,
    sessionId: "thread-a",
    source: "appServer",
    status: { type: "idle" },
    threadSource: null,
    turns: [
      {
        completedAt: 1_783_000_010,
        durationMs: 2500,
        error: null,
        id: "turn-a",
        items: [],
        itemsView: "full",
        startedAt: 1_783_000_000,
        status: "completed",
      },
    ],
    updatedAt: 1_783_000_100,
  };
}
