import type { Thread } from "@codexkit/app-server-protocol/v2";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

type MessageParams = Record<string, string>;

const messageLabels: Record<string, string> = {
  refresh: "Refresh",
  session_action_open_in_codex: "Open in Codex",
  session_detail_back_to_sessions: "Sessions",
  session_detail_cli_version: "CLI version",
  session_detail_command: "Command",
  session_detail_command_actions: "Command actions",
  session_detail_command_output: "Command output",
  session_detail_completed_at: "Completed",
  session_detail_context_compaction: "Context compaction checkpoint",
  session_detail_created_at: "Created",
  session_detail_cwd: "Working directory",
  session_detail_diff: "Diff",
  session_detail_duration: "Duration",
  session_detail_empty_value: "-",
  session_detail_ephemeral: "Ephemeral",
  session_detail_exit_code: "Exit code",
  session_detail_forked_from_id: "Forked from",
  session_detail_git_branch: "Git branch",
  session_detail_git_origin: "Git origin",
  session_detail_git_sha: "Git SHA",
  session_detail_item_agent_message: "Agent message",
  session_detail_item_command_execution: "Command execution",
  session_detail_item_file_change: "File change",
  session_detail_item_mcp_tool_call: "MCP tool call",
  session_detail_item_user_message: "User message",
  session_detail_items_view: "Items view",
  session_detail_kind: "Kind",
  session_detail_model_provider: "Model provider",
  session_detail_no: "No",
  session_detail_parent_thread_id: "Parent thread",
  session_detail_path: "Path",
  session_detail_process_id: "Process ID",
  session_detail_raw_json: "Raw JSON",
  session_detail_recency_at: "Recency",
  session_detail_result: "Result",
  session_detail_server: "Server",
  session_detail_session_id: "Session ID",
  session_detail_source: "Source",
  session_detail_started_at: "Started",
  session_detail_status: "Status",
  session_detail_status_idle: "Idle",
  session_detail_success: "Success",
  session_detail_thread_id: "Thread ID",
  session_detail_thread_source: "Thread source",
  session_detail_timeline_title: "Timeline",
  session_detail_tool: "Tool",
  session_detail_turn_count: "{count} turns",
  session_detail_turn_id: "Turn ID",
  session_detail_turn_status: "Turn status",
  session_detail_turn_status_completed: "Completed",
  session_detail_turn_title: "Turn {index}",
  session_detail_updated_at: "Updated",
  session_detail_yes: "Yes",
};

vi.mock("@lobehub/icons/es/Codex", () => ({
  default: {
    Color: (_props: { size?: number }) => <span data-testid="codex-icon" />,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("@/features/settings/i18n-provider", () => ({
  useRuntimeI18n: () => ({
    locale: "en",
    setLocalePreference: vi.fn(),
    t: createMessages(),
  }),
}));

import { SessionDetailView } from "./session-detail-components";

describe("SessionDetailView", () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("renders metadata, representative thread items, raw JSON affordances, and no input controls", async () => {
    const rendered = await renderSessionDetail(createThread());
    const text = rendered.container.textContent ?? "";

    expect(text).toContain("Build detail page");
    expect(text).toContain("Thread ID");
    expect(text).toContain("thread-a");
    expect(text).toContain("Working directory");
    expect(text).toContain("/workspace/project");
    expect(text).toContain("User message");
    expect(text).toContain("Fix the CI failure");
    expect(text).toContain("Command execution");
    expect(text).toContain("vp test");
    expect(text).toContain("File change");
    expect(text).toContain("src/app.ts");
    expect(text).toContain("move_path");
    expect(text).toContain("MCP tool call");
    expect(text).toContain("Raw JSON");
    expect(
      rendered.container.querySelector("input, textarea, [contenteditable='true']"),
    ).toBeNull();

    await unmount(rendered.root);
  });
});

async function renderSessionDetail(thread: Thread): Promise<{
  container: HTMLDivElement;
  root: Root;
}> {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <SessionDetailView
        isOpeningInCodex={false}
        isRefreshing={false}
        thread={thread}
        onOpenInCodex={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
  });

  return { container, root };
}

async function unmount(root: Root): Promise<void> {
  await act(async () => {
    root.unmount();
  });
}

function createMessages() {
  return new Proxy(
    {},
    {
      get(_target, property) {
        return (params?: MessageParams) => {
          const key = String(property);
          const template = messageLabels[key] ?? key;

          return Object.entries(params ?? {}).reduce(
            (message, [param, value]) => message.replace(`{${param}}`, value),
            template,
          );
        };
      },
    },
  ) as Record<string, (params?: MessageParams) => string>;
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
    preview: "Read-only detail view",
    recencyAt: 1_783_000_120,
    sessionId: "thread-a",
    source: "appServer",
    status: { type: "idle" },
    threadSource: null,
    turns: [
      {
        completedAt: 1_783_000_015,
        durationMs: 15000,
        error: null,
        id: "turn-a",
        items: [
          {
            clientId: "client-a",
            content: [
              {
                text: "Fix the CI failure",
                text_elements: [],
                type: "text",
              },
            ],
            id: "item-user",
            type: "userMessage",
          },
          {
            id: "item-agent",
            memoryCitation: null,
            phase: null,
            text: "I will inspect the failing tests.",
            type: "agentMessage",
          },
          {
            aggregatedOutput: "1 passed",
            command: "vp test",
            commandActions: [{ command: "vp test", type: "unknown" }],
            cwd: "/workspace/project",
            durationMs: 1000,
            exitCode: 0,
            id: "item-command",
            processId: "proc-a",
            source: "agent",
            status: "completed",
            type: "commandExecution",
          },
          {
            changes: [
              {
                diff: "@@\n+fixed\n",
                kind: { type: "update", move_path: "src/app-renamed.ts" },
                path: "src/app.ts",
              },
            ],
            id: "item-file",
            status: "completed",
            type: "fileChange",
          },
          {
            appContext: null,
            arguments: { q: "docs" },
            durationMs: 42,
            error: null,
            id: "item-mcp",
            pluginId: null,
            result: {
              _meta: null,
              content: [],
              structuredContent: { ok: true },
            },
            server: "docs",
            status: "completed",
            tool: "search",
            type: "mcpToolCall",
          },
        ],
        itemsView: "full",
        startedAt: 1_783_000_000,
        status: "completed",
      },
    ],
    updatedAt: 1_783_000_120,
  };
}
