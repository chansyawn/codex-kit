import { useQuery } from "@tanstack/react-query";

import { readSessions, type ReadSessionsQuery } from "@/features/sessions/client";

export function useSessionsData(query: ReadSessionsQuery) {
  const sessionsQuery = useQuery({
    queryFn: () => readSessions(query),
    queryKey: ["sessions", query],
  });

  return {
    isRefreshing: sessionsQuery.isFetching,
    refresh: () => {
      void sessionsQuery.refetch();
    },
    sessionsQuery,
  };
}
