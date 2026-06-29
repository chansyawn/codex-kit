export type DashboardGroupBy = "provider" | "model" | "project";

export type DashboardSummary = {
  activeDays: number;
  averageTokensPerSession: number;
  currentStreakDays: number;
  longestSessionMs: number;
  longestStreakDays: number;
  medianTokensPerSession: number;
  mostUsedReasoningEffort: string;
  p90TokensPerSession: number;
  peakSessionTokens: number;
  sessionCount: number;
  totalTokens: number;
};

export type DashboardActivityDay = {
  count: number;
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
};

export type DashboardTrendPoint = {
  date: string;
  sessions: number;
  tokens: number;
};

export type DashboardGroupMetric = {
  activeDays: number;
  averageTokensPerSession: number;
  key: string;
  label: string;
  longestSessionMs: number;
  p90TokensPerSession: number;
  peakSessionTokens: number;
  sessionCount: number;
  totalTokens: number;
};

export type DashboardResponse = {
  activity: DashboardActivityDay[];
  groups: Record<DashboardGroupBy, DashboardGroupMetric[]>;
  summary: DashboardSummary;
  trend: DashboardTrendPoint[];
};
