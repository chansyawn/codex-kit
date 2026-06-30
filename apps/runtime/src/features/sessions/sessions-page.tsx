import { useMemo, useState } from "react";

import {
  SessionsEmpty,
  SessionsError,
  SessionsFilter,
  type SessionsFilterValue,
  SessionsPageHeader,
  SessionsSkeleton,
  SessionCard,
} from "@/features/sessions/components";
import { useSessionsData } from "@/features/sessions/use-sessions-data";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";

export function SessionsPage() {
  const { t } = useRuntimeI18n();
  const { isRefreshing, refresh, sessionsQuery } = useSessionsData();
  const [filter, setFilter] = useState<SessionsFilterValue>("all");

  const sessions = sessionsQuery.data ?? [];
  const visibleSessions = useMemo(() => {
    if (filter === "active") return sessions.filter((session) => !session.archived);
    if (filter === "archived") return sessions.filter((session) => session.archived);
    return sessions;
  }, [filter, sessions]);

  return (
    <>
      <SessionsPageHeader isRefreshing={isRefreshing} onRefresh={refresh} />

      <SessionsFilter value={filter} onChange={setFilter} />

      <div className="grid gap-3">
        {sessionsQuery.isError ? <SessionsError message={t.sessions_load_error()} /> : null}
        {!sessionsQuery.isError && sessionsQuery.isLoading ? <SessionsSkeleton /> : null}
        {!sessionsQuery.isError && !sessionsQuery.isLoading && visibleSessions.length === 0 ? (
          <SessionsEmpty message={t.sessions_empty()} />
        ) : null}
        {visibleSessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </>
  );
}
