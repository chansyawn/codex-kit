import { useMemo, useState } from "react";

import {
  DashboardEmpty,
  DashboardError,
  DashboardGroupTable,
  DashboardPageHeader,
  DashboardRangeFilter,
  DashboardSkeleton,
  DashboardSummaryCards,
} from "@/features/dashboard/components";
import type { DashboardGroupBy, DashboardRange } from "@/features/dashboard/model";
import { useDashboardData } from "@/features/dashboard/use-dashboard-data";

export function DashboardPage() {
  const [range, setRange] = useState<DashboardRange>("7d");
  const { dashboardQuery, isRefreshing, refresh } = useDashboardData(range);
  const [groupBy, setGroupBy] = useState<DashboardGroupBy>("provider");
  const dashboard = dashboardQuery.data;
  const groups = useMemo(() => dashboard?.groups[groupBy] ?? [], [dashboard, groupBy]);

  return (
    <>
      <DashboardPageHeader isRefreshing={isRefreshing} onRefresh={refresh} />
      <DashboardRangeFilter onChange={setRange} value={range} />

      {dashboardQuery.isError ? <DashboardError /> : null}
      {!dashboardQuery.isError && dashboardQuery.isLoading ? <DashboardSkeleton /> : null}
      {!dashboardQuery.isError &&
      !dashboardQuery.isLoading &&
      dashboard?.summary.sessionCount === 0 ? (
        <DashboardEmpty />
      ) : null}
      {!dashboardQuery.isError &&
      !dashboardQuery.isLoading &&
      dashboard &&
      dashboard.summary.sessionCount > 0 ? (
        <>
          <DashboardSummaryCards summary={dashboard.summary} />
          <DashboardGroupTable groupBy={groupBy} groups={groups} onGroupByChange={setGroupBy} />
        </>
      ) : null}
    </>
  );
}
