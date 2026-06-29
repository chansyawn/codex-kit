import { useQuery } from "@tanstack/react-query";

import { readDashboard } from "@/features/dashboard/client";

export function useDashboardData() {
  const dashboardQuery = useQuery({
    queryFn: readDashboard,
    queryKey: ["dashboard"],
  });

  return {
    dashboardQuery,
    isRefreshing: dashboardQuery.isFetching,
    refresh: () => {
      void dashboardQuery.refetch();
    },
  };
}
