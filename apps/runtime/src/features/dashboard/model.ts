export type DashboardGroupBy = "provider" | "model" | "project";
export type DashboardRange = "7d" | "30d" | "180d" | "all";

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
  groups: Record<DashboardGroupBy, DashboardGroupMetric[]>;
  summary: DashboardSummary;
};
