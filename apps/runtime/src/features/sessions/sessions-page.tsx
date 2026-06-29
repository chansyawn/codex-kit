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
import { m } from "@/locales/paraglide/messages";

export function SessionsPage() {
  const { isRefreshing, refresh, sessionsQuery } = useSessionsData();
  const [filter, setFilter] = useState<SessionsFilterValue>("all");

  const sessions = sessionsQuery.data ?? [];
  const visibleSessions = useMemo(() => {
    if (filter === "active") return sessions.filter((session) => !session.archived);
    if (filter === "archived") return sessions.filter((session) => session.archived);
    return sessions;
  }, [filter, sessions]);

  return (
    <section className="grid gap-5 py-4">
      <SessionsPageHeader isRefreshing={isRefreshing} onRefresh={refresh} />

      <SessionsFilter value={filter} onChange={setFilter} />

      <div className="grid gap-3">
        {sessionsQuery.isError ? <SessionsError message={m.sessions_load_error()} /> : null}
        {!sessionsQuery.isError && sessionsQuery.isLoading ? <SessionsSkeleton /> : null}
        {!sessionsQuery.isError && !sessionsQuery.isLoading && visibleSessions.length === 0 ? (
          <SessionsEmpty message={m.sessions_empty()} />
        ) : null}
        {visibleSessions.map((session) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    </section>
  );
}
