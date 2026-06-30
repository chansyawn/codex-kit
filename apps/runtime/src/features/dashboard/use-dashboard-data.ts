import { useQuery } from "@tanstack/react-query";

import { readDashboard } from "@/features/dashboard/client";
import type { DashboardRange } from "@/features/dashboard/model";

export function useDashboardData(range: DashboardRange) {
  const dashboardQuery = useQuery({
    queryFn: () => readDashboard(range),
    queryKey: ["dashboard", range],
  });

  return {
    dashboardQuery,
    isRefreshing: dashboardQuery.isFetching,
    refresh: () => {
      void dashboardQuery.refetch();
    },
  };
}
