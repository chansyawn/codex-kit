import { Link } from "@tanstack/react-router";
import { RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { SessionSummary } from "@/features/sessions/model";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { Button } from "@/ui/components/button";
import { Skeleton } from "@/ui/components/skeleton";
import { formatCompactNumber } from "@/ui/lib/number-format";
import { cn } from "@/ui/lib/utils";

export type SessionsFilterValue = "all" | "active" | "archived";

type SessionsPageHeaderProps = {
  isRefreshing: boolean;
  onRefresh: () => void;
};

export function SessionsPageHeader({ isRefreshing, onRefresh }: SessionsPageHeaderProps) {
  const { t } = useRuntimeI18n();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-base font-semibold">{t.sessions_page_title()}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t.sessions_page_detail()}</p>
      </div>
      <Button variant="outline" onClick={onRefresh}>
        <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && "animate-spin")} />
        {t.refresh()}
      </Button>
    </header>
  );
}

type SessionsFilterProps = {
  onChange: (value: SessionsFilterValue) => void;
  value: SessionsFilterValue;
};

const FILTER_OPTIONS = [
  { labelKey: "sessions_filter_all", value: "all" },
  { labelKey: "sessions_filter_active", value: "active" },
  { labelKey: "sessions_filter_archived", value: "archived" },
] as const satisfies { labelKey: keyof RuntimeMessages; value: SessionsFilterValue }[];

type RuntimeMessages = ReturnType<typeof useRuntimeI18n>["t"];

export function SessionsFilter({ onChange, value }: SessionsFilterProps) {
  const { t } = useRuntimeI18n();

  return (
    <div className="inline-flex rounded-lg border p-0.5">
      {FILTER_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Button
            key={option.value}
            size="sm"
            variant={active ? "secondary" : "ghost"}
            onClick={() => onChange(option.value)}
          >
            {t[option.labelKey]()}
          </Button>
        );
      })}
    </div>
  );
}

function formatActivity(iso: string): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

type SessionCardProps = {
  session: SessionSummary;
};

export function SessionCard({ session }: SessionCardProps) {
  const { locale, t } = useRuntimeI18n();
  const metaSegments = [
    session.model ? `${session.model}·${session.modelProvider}` : session.modelProvider,
    session.tokensUsed > 0
      ? `${formatCompactNumber(session.tokensUsed, locale)} ${t.session_tokens_label()}`
      : "",
    formatActivity(session.lastActivityAt),
  ].filter(Boolean);

  return (
    <Link
      to="/sessions/$sessionId"
      params={{ sessionId: session.id }}
      className="bg-card hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 block rounded-lg border p-4 transition-colors outline-none focus-visible:ring-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="min-w-0 font-medium break-all">{session.title}</h2>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs",
            session.archived ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
          )}
        >
          {session.archived ? t.session_status_archived() : t.session_status_active()}
        </span>
      </div>
      <p className="text-muted-foreground mt-1 text-sm break-all">{session.cwd}</p>
      {session.preview ? (
        <p className="text-muted-foreground mt-2 line-clamp-1 text-sm">{session.preview}</p>
      ) : null}
      <p className="text-muted-foreground mt-3 text-xs">{metaSegments.join(" · ")}</p>
    </Link>
  );
}

export function SessionsSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-card rounded-lg border p-4">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-3 h-3 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function SessionsError({ message }: { message: string }) {
  return <p className="text-destructive text-sm">{message}</p>;
}

export function SessionsEmpty({ message }: { message: string }): ReactNode {
  return <p className="text-muted-foreground text-sm">{message}</p>;
}
