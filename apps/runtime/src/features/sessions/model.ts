export type SessionSource = "codex-app" | "codex-cli" | "unknown";

export type SessionSummary = {
  branch?: string;
  cwd: string;
  id: string;
  lastActivityAt: string;
  source: SessionSource;
  title: string;
};
