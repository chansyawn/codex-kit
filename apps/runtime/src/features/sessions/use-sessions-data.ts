import { useQuery } from "@tanstack/react-query";

import {
  readSessionDetail,
  readSessionFilters,
  readSessions,
  type ReadSessionFiltersQuery,
  type ReadSessionsQuery,
} from "@/features/sessions/client";

export function useSessionsData(query: ReadSessionsQuery) {
  const sessionsQuery = useQuery({
    placeholderData: (previousData) => previousData,
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
    placeholderData: (previousData) => previousData,
    queryFn: () => readSessionFilters(query),
    queryKey: ["session-filters", query],
  });

  return {
    sessionFiltersQuery,
  };
}

export function useSessionDetailData(sessionId: string) {
  const sessionDetailQuery = useQuery({
    queryFn: () => readSessionDetail(sessionId),
    queryKey: ["session-detail", sessionId],
  });

  return {
    isRefreshing: sessionDetailQuery.isFetching,
    refresh: () => {
      void sessionDetailQuery.refetch();
    },
    sessionDetailQuery,
  };
}
