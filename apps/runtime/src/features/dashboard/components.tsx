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
import { m } from "@/locales/paraglide/messages";
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
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-semibold">{m.dashboard_page_title()}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{m.dashboard_page_detail()}</p>
      </div>
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && "animate-spin")} />
        {m.refresh()}
      </Button>
    </header>
  );
}

export function DashboardSummaryCards({ summary }: { summary: DashboardResponse["summary"] }) {
  const cards = [
    { label: m.dashboard_total_tokens(), value: formatTokens(summary.totalTokens) },
    { label: m.dashboard_session_count(), value: formatInteger(summary.sessionCount) },
    { label: m.dashboard_average_tokens(), value: formatTokens(summary.averageTokensPerSession) },
    { label: m.dashboard_p90_tokens(), value: formatTokens(summary.p90TokensPerSession) },
    { label: m.dashboard_peak_session_tokens(), value: formatTokens(summary.peakSessionTokens) },
    { label: m.dashboard_longest_session(), value: formatDuration(summary.longestSessionMs) },
    {
      label: m.dashboard_current_streak(),
      value: m.dashboard_days_count({ count: summary.currentStreakDays }),
    },
    { label: m.dashboard_top_reasoning_effort(), value: summary.mostUsedReasoningEffort },
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
  const chartConfig = {
    sessions: {
      color: "var(--chart-2)",
      label: m.dashboard_chart_sessions(),
    },
    tokens: {
      color: "var(--chart-1)",
      label: m.dashboard_chart_tokens(),
    },
  } satisfies ChartConfig;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(420px,1fr)]">
      <section className="bg-card rounded-lg border p-4">
        <div className="mb-4">
          <h2 className="font-medium">{m.dashboard_token_trend()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{m.dashboard_token_trend_detail()}</p>
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
          <h2 className="font-medium">{m.dashboard_activity()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{m.dashboard_activity_detail()}</p>
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
                less: m.dashboard_calendar_less(),
                more: m.dashboard_calendar_more(),
              },
              months: [
                m.month_jan(),
                m.month_feb(),
                m.month_mar(),
                m.month_apr(),
                m.month_may(),
                m.month_jun(),
                m.month_jul(),
                m.month_aug(),
                m.month_sep(),
                m.month_oct(),
                m.month_nov(),
                m.month_dec(),
              ],
              totalCount: "{{year}} · {{count}} Token",
              weekdays: [
                m.weekday_sun(),
                m.weekday_mon(),
                m.weekday_tue(),
                m.weekday_wed(),
                m.weekday_thu(),
                m.weekday_fri(),
                m.weekday_sat(),
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

const groupOptions: { label: () => string; value: DashboardGroupBy }[] = [
  { label: () => m.dashboard_group_provider(), value: "provider" },
  { label: () => m.dashboard_group_model(), value: "model" },
  { label: () => m.dashboard_group_project(), value: "project" },
];

export function DashboardGroupTable({
  groupBy,
  groups,
  onGroupByChange,
}: DashboardGroupTableProps) {
  return (
    <section className="bg-card rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-medium">{m.dashboard_group_analysis()}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {m.dashboard_group_analysis_detail()}
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
                {option.label()}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-muted-foreground border-b text-left text-xs">
              <th className="px-4 py-3 font-medium">{getGroupColumnLabel(groupBy)}</th>
              <th className="px-4 py-3 text-right font-medium">{m.dashboard_total_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">{m.dashboard_session_count()}</th>
              <th className="px-4 py-3 text-right font-medium">{m.dashboard_average_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">{m.dashboard_p90_tokens()}</th>
              <th className="px-4 py-3 text-right font-medium">
                {m.dashboard_peak_session_tokens()}
              </th>
              <th className="px-4 py-3 text-right font-medium">{m.dashboard_active_days()}</th>
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
  return <p className="text-destructive text-sm">{m.dashboard_load_error()}</p>;
}

export function DashboardEmpty() {
  return <p className="text-muted-foreground text-sm">{m.dashboard_empty()}</p>;
}

function getGroupColumnLabel(groupBy: DashboardGroupBy): string {
  if (groupBy === "provider") return m.dashboard_group_provider();
  if (groupBy === "model") return m.dashboard_group_model();

  return m.dashboard_group_project();
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

function formatDuration(durationMs: number): string {
  const minutes = Math.floor(durationMs / 60_000);
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  const remainingMinutes = minutes % 60;

  if (days > 0) return m.dashboard_duration_days({ days, hours, minutes: remainingMinutes });
  if (hours > 0) return m.dashboard_duration_hours({ hours, minutes: remainingMinutes });

  return m.dashboard_duration_minutes({ minutes: remainingMinutes });
}

function formatShortDate(date: string): string {
  return date.slice(5);
}
