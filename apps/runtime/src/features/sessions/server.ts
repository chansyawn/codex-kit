import type { SessionSummary } from "./model";

export type ListSessionsOptions = {
  now: Date;
};

export async function listSessions(options: ListSessionsOptions): Promise<SessionSummary[]> {
  return [
    {
      branch: "main",
      cwd: "/path/to/project",
      id: "session_local_demo",
      lastActivityAt: options.now.toISOString(),
      source: "codex-app",
      title: "Architecture planning session",
    },
  ];
}
