import { useQuery } from "@tanstack/react-query";

import {
  readSessionFilters,
  readSessions,
  type ReadSessionFiltersQuery,
  type ReadSessionsQuery,
} from "@/features/sessions/client";

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

export function useSessionFiltersData(query: ReadSessionFiltersQuery = {}) {
  const sessionFiltersQuery = useQuery({
    queryFn: () => readSessionFilters(query),
    queryKey: ["session-filters", query],
  });

  return {
    sessionFiltersQuery,
  };
}
