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
