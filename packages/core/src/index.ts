import type { ConfigOverview, SessionSummary } from "@codexkit/shared";

export type CodexKitCoreOptions = {
  codexHome: string;
  now?: () => Date;
};

export type CodexKitCore = {
  config: {
    getOverview: () => Promise<ConfigOverview>;
  };
  sessions: {
    list: () => Promise<SessionSummary[]>;
  };
};

export function createCodexKitCore(options: CodexKitCoreOptions): CodexKitCore {
  const now = options.now ?? (() => new Date());

  return {
    config: {
      async getOverview() {
        return createStubConfigOverview(options.codexHome);
      },
    },
    sessions: {
      async list() {
        return createStubSessions(now());
      },
    },
  };
}

function createStubSessions(now: Date): SessionSummary[] {
  return [
    {
      branch: "main",
      cwd: "/path/to/project",
      id: "session_local_demo",
      lastActivityAt: now.toISOString(),
      source: "codex-app",
      title: "Architecture planning session",
    },
  ];
}

function createStubConfigOverview(codexHome: string): ConfigOverview {
  return {
    global: [
      {
        key: "model",
        valuePreview: "gpt-5-codex",
      },
      {
        key: "approval_policy",
        valuePreview: "never",
      },
    ],
    projects: [
      {
        path: "/path/to/project",
        trustedLevel: "trusted",
        values: [
          {
            key: "trusted_level",
            valuePreview: "trusted",
          },
        ],
      },
    ],
    sourcePath: `${codexHome}/config.toml`,
  };
}
