export type SessionFilterOption<TValue extends boolean | string = string> = {
  count: number;
  label: string;
  value: TValue;
};

export type SessionListQuery = {
  archived?: boolean;
  page: number;
  perPage: number;
  project: string[];
  provider: string[];
  title: string;
};

export type SessionListQueryInput = {
  archived?: unknown;
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
