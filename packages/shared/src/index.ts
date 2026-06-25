export type ApiResult<TData> =
  | {
      data: TData;
      ok: true;
    }
  | {
      error: {
        code: string;
        message: string;
      };
      ok: false;
    };

export type HealthResponse = {
  ok: true;
  uptimeMs: number;
  version: string;
};

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

export function createApiSuccess<TData>(data: TData): ApiResult<TData> {
  return {
    data,
    ok: true,
  };
}

export function createApiError(code: string, message: string): ApiResult<never> {
  return {
    error: {
      code,
      message,
    },
    ok: false,
  };
}
