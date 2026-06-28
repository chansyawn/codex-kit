import { createRuntimeSettingsStore } from "@/server/core/settings-store";
import type { RuntimeSettings, RuntimeSettingsPatch } from "@/shared/settings";

export type SessionSource = "codex-app" | "codex-cli" | "unknown";

export type SessionSummary = {
  branch?: string;
  cwd: string;
  id: string;
  lastActivityAt: string;
  source: SessionSource;
  title: string;
};

export type ConfigEntry = {
  key: string;
  valuePreview: string;
};

export type ProjectConfigEntry = {
  path: string;
  trustedLevel?: string;
  values: ConfigEntry[];
};

export type ConfigOverview = {
  global: ConfigEntry[];
  projects: ProjectConfigEntry[];
  sourcePath: string;
};

export type CodexKitCoreOptions = {
  codexHome: string;
  now?: () => Date;
};

export type CodexKitCore = {
  config: {
    getOverview: () => Promise<ConfigOverview>;
  };
  settings: {
    get: () => Promise<RuntimeSettings>;
    patch: (patch: RuntimeSettingsPatch) => Promise<RuntimeSettings>;
  };
  sessions: {
    list: () => Promise<SessionSummary[]>;
  };
};

export function createCodexKitCore(options: CodexKitCoreOptions): CodexKitCore {
  const now = options.now ?? (() => new Date());
  const settings = createRuntimeSettingsStore(options.codexHome);

  return {
    config: {
      async getOverview() {
        return createStubConfigOverview(options.codexHome);
      },
    },
    settings: {
      get: settings.read,
      patch: settings.patch,
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
