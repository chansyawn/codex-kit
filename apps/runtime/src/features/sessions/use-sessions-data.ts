import { useQuery } from "@tanstack/react-query";

import { readSessions } from "@/features/sessions/client";

export function useSessionsData() {
  const sessionsQuery = useQuery({
    queryFn: readSessions,
    queryKey: ["sessions"],
  });

  return {
    isRefreshing: sessionsQuery.isFetching,
    refresh: () => {
      void sessionsQuery.refetch();
    },
    sessionsQuery,
  };
}
