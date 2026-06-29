import { useMemo, useState } from "react";

import {
  DashboardCharts,
  DashboardEmpty,
  DashboardError,
  DashboardGroupTable,
  DashboardPageHeader,
  DashboardSkeleton,
  DashboardSummaryCards,
} from "@/features/dashboard/components";
import type { DashboardGroupBy } from "@/features/dashboard/model";
import { useDashboardData } from "@/features/dashboard/use-dashboard-data";

export function DashboardPage() {
  const { dashboardQuery, isRefreshing, refresh } = useDashboardData();
  const [groupBy, setGroupBy] = useState<DashboardGroupBy>("provider");
  const dashboard = dashboardQuery.data;
  const groups = useMemo(() => dashboard?.groups[groupBy] ?? [], [dashboard, groupBy]);

  return (
    <section className="grid gap-5 py-4">
      <DashboardPageHeader isRefreshing={isRefreshing} onRefresh={refresh} />

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
          <DashboardCharts activity={dashboard.activity} trend={dashboard.trend} />
          <DashboardGroupTable groupBy={groupBy} groups={groups} onGroupByChange={setGroupBy} />
        </>
      ) : null}
    </section>
  );
}
