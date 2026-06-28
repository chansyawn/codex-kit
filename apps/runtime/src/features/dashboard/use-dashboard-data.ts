import { useQuery } from "@tanstack/react-query";

import { readConfigOverview } from "@/features/config/client";
import { readHealth } from "@/features/runtime-status/client";
import { readSessions } from "@/features/sessions/client";

export function useDashboardData() {
  const healthQuery = useQuery({
    queryFn: readHealth,
    queryKey: ["health"],
  });
  const sessionsQuery = useQuery({
    queryFn: readSessions,
    queryKey: ["sessions"],
  });
  const configQuery = useQuery({
    queryFn: readConfigOverview,
    queryKey: ["config-overview"],
  });

  const isRefreshing = healthQuery.isFetching || sessionsQuery.isFetching || configQuery.isFetching;

  return {
    configQuery,
    healthQuery,
    isRefreshing,
    refreshAll: () => {
      void healthQuery.refetch();
      void sessionsQuery.refetch();
      void configQuery.refetch();
    },
    sessionsQuery,
  };
}
