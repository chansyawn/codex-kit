export type SessionFilterOption<TValue extends boolean | string = string> = {
  count: number;
  label: string;
  value: TValue;
};

export type SessionListQuery = {
  archived?: boolean;
  lastActivityFrom?: string;
  lastActivityTo?: string;
  page: number;
  perPage: number;
  project: string[];
  provider: string[];
  title: string;
};

export type SessionListQueryInput = {
  archived?: unknown;
  lastActivityFrom?: unknown;
  lastActivityTo?: unknown;
  page?: unknown;
  perPage?: unknown;
  project?: unknown;
  provider?: unknown;
  title?: unknown;
};

export type SessionSummary = {
  archived: boolean;
  archivedAt: string | null;
  branch: string | null;
  createdAt: string;
  cwd: string;
  id: string;
  lastActivityAt: string;
  model: string;
  modelProvider: string;
  preview: string;
  rolloutPath: string;
  source: string;
  title: string;
  tokensUsed: number;
};

export type SessionsResponse = {
  data: SessionSummary[];
  pageInfo: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

export type SessionsFiltersResponse = {
  archived: SessionFilterOption<boolean>[];
  projects: SessionFilterOption[];
  providers: SessionFilterOption[];
};

export type JsonPrimitive = boolean | number | string | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type SessionDetailResponse = {
  thread: SessionThread;
};

export type SessionThread = {
  agentNickname: string | null;
  agentRole: string | null;
  cliVersion: string;
  createdAt: number;
  cwd: string;
  ephemeral: boolean;
  forkedFromId: string | null;
  gitInfo: SessionGitInfo | null;
  id: string;
  modelProvider: string;
  name: string | null;
  parentThreadId: string | null;
  path: string | null;
  preview: string;
  recencyAt: number | null;
  sessionId: string;
  source: SessionSource;
  status: SessionThreadStatus;
  threadSource: string | null;
  turns: SessionTurn[];
  updatedAt: number;
};

export type SessionGitInfo = {
  branch: string | null;
  originUrl: string | null;
  sha: string | null;
};

export type SessionSource =
  | "appServer"
  | "cli"
  | "exec"
  | "unknown"
  | "vscode"
  | { custom: string }
  | { subAgent: JsonValue };

export type SessionThreadActiveFlag = "waitingOnApproval" | "waitingOnUserInput";

export type SessionThreadStatus =
  | { type: "active"; activeFlags: SessionThreadActiveFlag[] }
  | { type: "idle" }
  | { type: "notLoaded" }
  | { type: "systemError" };

export type SessionTurn = {
  completedAt: number | null;
  durationMs: number | null;
  error: SessionTurnError | null;
  id: string;
  items: SessionThreadItem[];
  itemsView: "full" | "notLoaded" | "summary";
  startedAt: number | null;
  status: "completed" | "failed" | "inProgress" | "interrupted";
};

export type SessionTurnError = {
  code?: string | null;
  message?: string | null;
};

export type SessionUserInput =
  | {
      text: string;
      text_elements: JsonValue[];
      type: "text";
    }
  | {
      detail?: string;
      type: "image";
      url: string;
    }
  | {
      detail?: string;
      path: string;
      type: "localImage";
    }
  | {
      name: string;
      path: string;
      type: "skill";
    }
  | {
      name: string;
      path: string;
      type: "mention";
    };

export type SessionFileUpdateChange = {
  diff: string;
  kind: JsonValue;
  path: string;
};

export type SessionCommandAction =
  | {
      command: string;
      name: string;
      path: string;
      type: "read";
    }
  | {
      command: string;
      path: string | null;
      type: "listFiles";
    }
  | {
      command: string;
      path: string | null;
      query: string | null;
      type: "search";
    }
  | {
      command: string;
      type: "unknown";
    };

export type SessionWebSearchAction =
  | {
      queries: string[] | null;
      query: string | null;
      type: "search";
    }
  | {
      type: "openPage";
      url: string | null;
    }
  | {
      pattern: string | null;
      type: "findInPage";
      url: string | null;
    }
  | { type: "other" };

export type SessionMcpToolCallResult = {
  _meta: JsonValue | null;
  content: JsonValue[];
  structuredContent: JsonValue | null;
};

export type SessionThreadItem =
  | {
      clientId: string | null;
      content: SessionUserInput[];
      id: string;
      type: "userMessage";
    }
  | {
      fragments: Array<{ hookRunId: string; text: string }>;
      id: string;
      type: "hookPrompt";
    }
  | {
      id: string;
      memoryCitation: JsonValue | null;
      phase: string | null;
      text: string;
      type: "agentMessage";
    }
  | {
      id: string;
      text: string;
      type: "plan";
    }
  | {
      content: string[];
      id: string;
      summary: string[];
      type: "reasoning";
    }
  | {
      aggregatedOutput: string | null;
      command: string;
      commandActions: SessionCommandAction[];
      cwd: string;
      durationMs: number | null;
      exitCode: number | null;
      id: string;
      processId: string | null;
      source: string;
      status: string;
      type: "commandExecution";
    }
  | {
      changes: SessionFileUpdateChange[];
      id: string;
      status: string;
      type: "fileChange";
    }
  | {
      appContext: JsonValue | null;
      arguments: JsonValue;
      durationMs: number | null;
      error: JsonValue | null;
      id: string;
      mcpAppResourceUri?: string;
      pluginId: string | null;
      result: SessionMcpToolCallResult | null;
      server: string;
      status: string;
      tool: string;
      type: "mcpToolCall";
    }
  | {
      arguments: JsonValue;
      contentItems: JsonValue[] | null;
      durationMs: number | null;
      id: string;
      namespace: string | null;
      status: string;
      success: boolean | null;
      tool: string;
      type: "dynamicToolCall";
    }
  | {
      agentsStates: { [key: string]: JsonValue };
      id: string;
      model: string | null;
      prompt: string | null;
      reasoningEffort: string | null;
      receiverThreadIds: string[];
      senderThreadId: string;
      status: string;
      tool: string;
      type: "collabAgentToolCall";
    }
  | {
      agentPath: string;
      agentThreadId: string;
      id: string;
      kind: string;
      type: "subAgentActivity";
    }
  | {
      action: SessionWebSearchAction | null;
      id: string;
      query: string;
      type: "webSearch";
    }
  | {
      id: string;
      path: string;
      type: "imageView";
    }
  | {
      durationMs: number;
      id: string;
      type: "sleep";
    }
  | {
      id: string;
      result: string;
      revisedPrompt: string | null;
      savedPath?: string;
      status: string;
      type: "imageGeneration";
    }
  | {
      id: string;
      review: string;
      type: "enteredReviewMode";
    }
  | {
      id: string;
      review: string;
      type: "exitedReviewMode";
    }
  | {
      id: string;
      type: "contextCompaction";
    };
