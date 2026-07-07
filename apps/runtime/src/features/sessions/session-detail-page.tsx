import { useState } from "react";

import { openDeeplink } from "@/features/sessions/client";
import {
  SessionDetailError,
  SessionDetailSkeleton,
  SessionDetailView,
} from "@/features/sessions/session-detail-components";
import { createCodexSessionDeeplink } from "@/features/sessions/session-links";
import { useSessionDetailData } from "@/features/sessions/use-sessions-data";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";

export type SessionDetailPageProps = {
  sessionId: string;
};

export function SessionDetailPage({ sessionId }: SessionDetailPageProps) {
  const { t } = useRuntimeI18n();
  const { isRefreshing, refresh, sessionDetailQuery } = useSessionDetailData(sessionId);
  const [isOpeningInCodex, setIsOpeningInCodex] = useState(false);
  const thread = sessionDetailQuery.data?.thread;

  function openSessionInCodex(): void {
    if (isOpeningInCodex || !thread) return;

    setIsOpeningInCodex(true);
    void openDeeplink(createCodexSessionDeeplink(thread.id))
      .catch(() => undefined)
      .finally(() => {
        setIsOpeningInCodex(false);
      });
  }

  if (sessionDetailQuery.isLoading) return <SessionDetailSkeleton />;

  if (sessionDetailQuery.isError || !thread) {
    return <SessionDetailError message={t.session_detail_load_error()} />;
  }

  return (
    <SessionDetailView
      isOpeningInCodex={isOpeningInCodex}
      isRefreshing={isRefreshing}
      thread={thread}
      onOpenInCodex={openSessionInCodex}
      onRefresh={refresh}
    />
  );
}
