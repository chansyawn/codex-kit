import { RefreshCwIcon } from "lucide-react";
import { ActivityCalendar } from "react-activity-calendar";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, type TooltipContentProps } from "recharts";

import type {
  DashboardActivityDay,
  DashboardGroupBy,
  DashboardGroupMetric,
  DashboardResponse,
  DashboardTrendPoint,
} from "@/features/dashboard/model";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { Button } from "@/ui/components/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/ui/components/chart";
import { Skeleton } from "@/ui/components/skeleton";
import { cn } from "@/ui/lib/utils";

type DashboardPageHeaderProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function DashboardPageHeader({ isRefreshing, onRefresh }: DashboardPageHeaderProps) {
  const { t } = useRuntimeI18n();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-semibold">{t.dashboard_page_title()}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t.dashboard_page_detail()}</p>
      </div>
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && "animate-spin")} />
        {t.refresh()}
      </Button>
    </header>
  );
}

type RuntimeMessages = ReturnType<typeof useRuntimeI18n>["t"];

export function DashboardSummaryCards({ summary }: { summary: DashboardResponse["summary"] }) {
  const { t } = useRuntimeI18n();
  const cards = [
    { label: t.dashboard_total_tokens(), value: formatTokens(summary.totalTokens) },
    { label: t.dashboard_session_count(), value: formatInteger(summary.sessionCount) },
    { label: t.dashboard_average_tokens(), value: formatTokens(summary.averageTokensPerSession) },
    { label: t.dashboard_p90_tokens(), value: formatTokens(summary.p90TokensPerSession) },
    { label: t.dashboard_peak_session_tokens(), value: formatTokens(summary.peakSessionTokens) },
    { label: t.dashboard_longest_session(), value: formatDuration(summary.longestSessionMs, t) },
    {
      label: t.dashboard_current_streak(),
      value: t.dashboard_days_count({ count: summary.currentStreakDays }),
    },
    { label: t.dashboard_top_reasoning_effort(), value: summary.mostUsedReasoningEffort },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="bg-card rounded-lg border p-4">
          <p className="text-muted-foreground text-xs font-medium">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
        </article>
      ))}
    </div>
  );
}

export function DashboardCharts({
  activity,
  trend,
}: {
  activity: DashboardActivityDay[];
  trend: DashboardTrendPoint[];
}) {
  const { t } = useRuntimeI18n();
  const chartConfig = {
    sessions: {
      color: "var(--chart-2)",
      label: t.dashboard_chart_sessions(),
    },
    tokens: {
      color: "var(--chart-1)",
      label: t.dashboard_chart_tokens(),
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)]">
      <section className="bg-card rounded-lg border p-4">
        <div className="mb-4">
          <h2 className="font-medium">{t.dashboard_token_trend()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t.dashboard_token_trend_detail()}</p>
        </div>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <AreaChart data={trend} margin={{ left: 4, right: 12, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatShortDate}
            />
            <YAxis hide domain={[0, "dataMax"]} />
            <ChartTooltip
              cursor={false}
              content={(props: TooltipContentProps) => (
                <ChartTooltipContent
                  active={props.active}
                  label={props.label}
                  payload={props.payload?.map((item) => ({
                    color: item.color,
                    dataKey: String(item.dataKey ?? ""),
                    name: item.name === undefined ? undefined : String(item.name),
                    value:
                      item.dataKey === "tokens"
                        ? formatTokens(Number(item.value ?? 0))
                        : String(item.value ?? ""),
                  }))}
                />
              )}
            />
            <Area
              dataKey="tokens"
              type="monotone"
              fill="var(--color-tokens)"
              fillOpacity={0.35}
              stroke="var(--color-tokens)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </section>

      <section className="bg-card min-w-0 rounded-lg border p-4">
        <div className="mb-4">
          <h2 className="font-medium">{t.dashboard_activity()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t.dashboard_activity_detail()}</p>
        </div>
        <div className="overflow-x-auto pb-1">
          <ActivityCalendar
            data={activity}
            blockMargin={5}
            blockRadius={3}
            blockSize={11}
            colorScheme="light"
            fontSize={12}
            labels={{
              legend: {
                less: t.dashboard_calendar_less(),
                more: t.dashboard_calendar_more(),
              },
              months: [
                t.month_jan(),
                t.month_feb(),
                t.month_mar(),
                t.month_apr(),
                t.month_may(),
                t.month_jun(),
                t.month_jul(),
                t.month_aug(),
                t.month_sep(),
                t.month_oct(),
                t.month_nov(),
                t.month_dec(),
              ],
              totalCount: "{{year}} · {{count}} Token",
              weekdays: [
                t.weekday_sun(),
                t.weekday_mon(),
                t.weekday_tue(),
                t.weekday_wed(),
                t.weekday_thu(),
                t.weekday_fri(),
                t.weekday_sat(),
              ],
            }}
            theme={{
              light: ["var(--muted)", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"],
            }}
          />
        </div>
      </section>
    </div>
  );
}

type DashboardGroupTableProps = {
  groupBy: DashboardGroupBy;
  groups: DashboardGroupMetric[];
  onGroupByChange: (value: DashboardGroupBy) => void;
};

const groupOptions = [
  { labelKey: "dashboard_group_provider", value: "provider" },
  { labelKey: "dashboard_group_model", value: "model" },
  { labelKey: "dashboard_group_project", value: "project" },
] as const satisfies { labelKey: keyof RuntimeMessages; value: DashboardGroupBy }[];

export function DashboardGroupTable({
  groupBy,
  groups,
  onGroupByChange,
}: DashboardGroupTableProps) {
  const { t } = useRuntimeI18n();

  return (
    <section className="bg-card rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-medium">{t.dashboard_group_analysis()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t.dashboard_group_analysis_detail()}
          </p>
        </div>
        <div className="inline-flex rounded-lg border p-0.5">
          {groupOptions.map((option) => {
            const active = option.value === groupBy;

            return (
              <Button
                key={option.value}
                size="sm"
                variant={active ? "secondary" : "ghost"}
                onClick={() => onGroupByChange(option.value)}
              >
                {t[option.labelKey]()}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-3 font-medium">{getGroupColumnLabel(groupBy, t)}</th>
              <th className="px-4 py-3 text-right font-medium">{t.dashboard_total_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">{t.dashboard_session_count()}</th>
              <th className="px-4 py-3 text-right font-medium">{t.dashboard_average_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">{t.dashboard_p90_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t.dashboard_peak_session_tokens()}
              </th>
              <th className="px-4 py-3 text-right font-medium">{t.dashboard_active_days()}</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.key} className="border-b last:border-0">
                <td className="max-w-72 px-4 py-3">
                  <div className="truncate font-medium" title={group.key}>
                    {group.label}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatTokens(group.totalTokens)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatInteger(group.sessionCount)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatTokens(group.averageTokensPerSession)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatTokens(group.p90TokensPerSession)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatTokens(group.peakSessionTokens)}
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums">
                  {formatInteger(group.activeDays)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="bg-card rounded-lg border p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
    </div>
  );
}

export function DashboardError() {
  const { t } = useRuntimeI18n();

  return <p className="text-destructive text-sm">{t.dashboard_load_error()}</p>;
}

export function DashboardEmpty() {
  const { t } = useRuntimeI18n();

  return <p className="text-muted-foreground text-sm">{t.dashboard_empty()}</p>;
}

function getGroupColumnLabel(groupBy: DashboardGroupBy, t: RuntimeMessages): string {
  if (groupBy === "provider") return t.dashboard_group_provider();
  if (groupBy === "model") return t.dashboard_group_model();

  return t.dashboard_group_project();
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function formatTokens(value: number): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function formatDuration(durationMs: number, t: RuntimeMessages): string {
  const minutes = Math.floor(durationMs / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) return t.dashboard_duration_days({ days, hours, minutes: remainingMinutes });
  if (hours > 0) return t.dashboard_duration_hours({ hours, minutes: remainingMinutes });

  return t.dashboard_duration_minutes({ minutes: remainingMinutes });
}

function formatShortDate(date: string): string {
  return date.slice(5);
}
