import { Link } from "@tanstack/react-router";
import { CalendarIcon, ChevronRightIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";

import type {
  SessionFilterOption,
  SessionsFiltersResponse,
  SessionsResponse,
  SessionSummary,
} from "@/features/sessions/model";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { Button } from "@/ui/components/button";
import { Calendar } from "@/ui/components/calendar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/components/collapsible";
import { EllipsisTooltip } from "@/ui/components/ellipsis-tooltip";
import { Input } from "@/ui/components/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/components/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/popover";
import { Skeleton } from "@/ui/components/skeleton";
import { formatCompactNumber, formatIntegerNumber } from "@/ui/lib/number-format";
import { cn } from "@/ui/lib/utils";

export type SessionTag = {
  id: string;
  label: string;
  onRemove: () => void;
};

export type SessionsTimeRangeValue = {
  lastActivityFrom?: string;
  lastActivityTo?: string;
};

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

type SessionsFilterSidebarProps = {
  archived: boolean | undefined;
  filters: SessionsFiltersResponse;
  isError: boolean;
  isLoading: boolean;
  onArchivedChange: (archived: boolean) => void;
  onProjectToggle: (project: string) => void;
  onProviderToggle: (provider: string) => void;
  onTimeRangeChange: (range: SessionsTimeRangeValue) => void;
  projects: string[];
  providers: string[];
  timeRange: SessionsTimeRangeValue;
};

export function SessionsFilterSidebar({
  archived,
  filters,
  isError,
  isLoading,
  onArchivedChange,
  onProjectToggle,
  onProviderToggle,
  onTimeRangeChange,
  projects,
  providers,
  timeRange,
}: SessionsFilterSidebarProps) {
  const { t } = useRuntimeI18n();

  return (
    <aside className="grid content-start gap-4 lg:w-64 lg:shrink-0">
      <SessionsTimeRangeFilter value={timeRange} onChange={onTimeRangeChange} />
      {isError ? <p className="text-destructive text-sm">{t.sessions_load_error()}</p> : null}
      {isLoading ? <SessionsFilterSkeleton /> : null}
      {!isLoading ? (
        <>
          <FilterGroup
            count={filters.projects.length}
            selectedCount={projects.length}
            title={t.sessions_filter_project()}
          >
            {filters.projects.length === 0 ? (
              <FilterEmpty>{t.sessions_filter_empty()}</FilterEmpty>
            ) : (
              filters.projects.map((filter) => (
                <FilterOptionButton
                  key={filter.value}
                  active={projects.includes(filter.value)}
                  count={filter.count}
                  label={filter.label}
                  onClick={() => onProjectToggle(filter.value)}
                />
              ))
            )}
          </FilterGroup>

          <FilterGroup
            count={filters.providers.length}
            selectedCount={providers.length}
            title={t.sessions_filter_provider()}
          >
            {filters.providers.length === 0 ? (
              <FilterEmpty>{t.sessions_filter_empty()}</FilterEmpty>
            ) : (
              filters.providers.map((filter) => (
                <FilterOptionButton
                  key={filter.value}
                  active={providers.includes(filter.value)}
                  count={filter.count}
                  label={filter.label}
                  onClick={() => onProviderToggle(filter.value)}
                />
              ))
            )}
          </FilterGroup>

          <FilterGroup
            count={filters.archived.length}
            selectedCount={archived === undefined ? 0 : 1}
            title={t.sessions_filter_archived_state()}
          >
            {filters.archived.map((filter) => (
              <FilterOptionButton
                key={String(filter.value)}
                active={archived === filter.value}
                count={filter.count}
                label={filter.value ? t.session_status_archived() : t.session_status_active()}
                onClick={() => onArchivedChange(filter.value)}
              />
            ))}
          </FilterGroup>
        </>
      ) : null}
    </aside>
  );
}

type RuntimeMessages = ReturnType<typeof useRuntimeI18n>["t"];

type SessionsTimeRangeFilterProps = {
  onChange: (range: SessionsTimeRangeValue) => void;
  value: SessionsTimeRangeValue;
};

export function SessionsTimeRangeFilter({ onChange, value }: SessionsTimeRangeFilterProps) {
  const { locale, t } = useRuntimeI18n();
  const now = new Date();
  const selectedRange = createCalendarRange(value);

  function selectCustomRange(range: DateRange | undefined): void {
    if (!range?.from) {
      onChange({});
      return;
    }

    const to = addDays(startOfLocalDay(range.to ?? range.from), 1);

    onChange({
      lastActivityFrom: startOfLocalDay(range.from).toISOString(),
      lastActivityTo: minDate(to, new Date()).toISOString(),
    });
  }

  return (
    <section className="grid gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              className="w-full justify-start"
              aria-label={t.sessions_time_range_title()}
            >
              <CalendarIcon data-icon="inline-start" />
              <span className="truncate">{formatTimeRangeLabel(value, locale, t)}</span>
            </Button>
          }
        />
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            disabled={{ after: now }}
            excludeDisabled
            mode="range"
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={selectCustomRange}
          />
        </PopoverContent>
      </Popover>
    </section>
  );
}

function createCalendarRange(value: SessionsTimeRangeValue): DateRange | undefined {
  if (!value.lastActivityFrom) return undefined;

  const from = new Date(value.lastActivityFrom);
  const to = value.lastActivityTo ? new Date(Date.parse(value.lastActivityTo) - 1) : undefined;

  return {
    from: Number.isNaN(from.getTime()) ? undefined : from,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };
}

function formatTimeRangeLabel(
  value: SessionsTimeRangeValue,
  locale: string,
  t: RuntimeMessages,
): string {
  if (!value.lastActivityFrom) return t.sessions_time_range_all();

  const from = new Date(value.lastActivityFrom);
  const to = value.lastActivityTo ? new Date(Date.parse(value.lastActivityTo) - 1) : from;
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${dateFormatter.format(from)} - ${dateFormatter.format(to)}`;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function minDate(date: Date, maxDate: Date): Date {
  return date.getTime() > maxDate.getTime() ? maxDate : date;
}

function SessionsFilterSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="grid gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-4/5" />
        </div>
      ))}
    </div>
  );
}

type FilterGroupProps = {
  children: ReactNode;
  count: number;
  defaultOpen?: boolean;
  selectedCount: number;
  title: string;
};

function FilterGroup({
  children,
  count,
  defaultOpen = false,
  selectedCount,
  title,
}: FilterGroupProps) {
  const { locale } = useRuntimeI18n();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible render={<section className="grid gap-2" />} open={open} onOpenChange={setOpen}>
      <h2>
        <CollapsibleTrigger className="hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 text-muted-foreground flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-start text-xs font-medium transition-colors outline-none focus-visible:ring-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <ChevronRightIcon
              aria-hidden="true"
              className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-90")}
            />
            <span className="truncate">{title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {selectedCount > 0 ? (
              <FilterCountBadge variant="selected">
                {formatIntegerNumber(selectedCount, locale)}
              </FilterCountBadge>
            ) : null}
            <FilterCountBadge>{formatIntegerNumber(count, locale)}</FilterCountBadge>
          </span>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="grid gap-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function FilterCountBadge({
  children,
  variant = "muted",
}: {
  children: ReactNode;
  variant?: "muted" | "selected";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md px-1.5 font-mono text-[0.7rem] tabular-nums",
        variant === "selected" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

function FilterEmpty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground px-2 py-1 text-xs">{children}</p>;
}

type FilterOptionButtonProps = {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
};

function FilterOptionButton({ active, count, label, onClick }: FilterOptionButtonProps) {
  const { locale } = useRuntimeI18n();

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      className="h-auto min-w-0 justify-between gap-3 px-2 py-1.5 text-start"
      onClick={onClick}
    >
      <EllipsisTooltip>{label}</EllipsisTooltip>
      <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
        {formatIntegerNumber(count, locale)}
      </span>
    </Button>
  );
}

type SessionsSearchBarProps = {
  onTitleChange: (title: string) => void;
  title: string;
};

export function SessionsSearchBar({ onTitleChange, title }: SessionsSearchBarProps) {
  const { t } = useRuntimeI18n();

  return (
    <Input
      aria-label={t.sessions_search_label()}
      placeholder={t.sessions_search_placeholder()}
      value={title}
      onChange={(event) => onTitleChange(event.target.value)}
    />
  );
}

type SessionsActiveTagsProps = {
  tags: SessionTag[];
};

export function SessionsActiveTags({ tags }: SessionsActiveTagsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="bg-secondary text-secondary-foreground inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs"
        >
          <span className="truncate">{tag.label}</span>
          <button
            type="button"
            className="hover:bg-muted-foreground/10 focus-visible:border-ring focus-visible:ring-ring/50 rounded-sm p-0.5 outline-none focus-visible:ring-2"
            aria-label={tag.label}
            onClick={tag.onRemove}
          >
            <XIcon aria-hidden="true" className="size-3" />
          </button>
        </span>
      ))}
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

export function SessionsPagination({
  onPageChange,
  pageInfo,
}: {
  onPageChange: (page: number) => void;
  pageInfo: SessionsResponse["pageInfo"];
}) {
  const { locale, t } = useRuntimeI18n();
  const canGoBack = pageInfo.page > 1;
  const canGoForward = pageInfo.page < pageInfo.totalPages;
  const pages = createPaginationItems(pageInfo.page, pageInfo.totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        {t.sessions_pagination_summary({
          page: formatIntegerNumber(pageInfo.page, locale),
          totalPages: formatIntegerNumber(Math.max(pageInfo.totalPages, 1), locale),
          total: formatIntegerNumber(pageInfo.total, locale),
        })}
      </p>
      <Pagination className="mx-0 w-auto justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              disabled={!canGoBack}
              onClick={(event) => {
                event.preventDefault();
                if (canGoBack) onPageChange(pageInfo.page - 1);
              }}
            >
              {t.sessions_pagination_previous()}
            </PaginationPrevious>
          </PaginationItem>
          {pages.map((page) => (
            <PaginationItem key={page}>
              {typeof page === "number" ? (
                <PaginationLink
                  href="#"
                  isActive={page === pageInfo.page}
                  onClick={(event) => {
                    event.preventDefault();
                    if (page !== pageInfo.page) onPageChange(page);
                  }}
                >
                  {formatIntegerNumber(page, locale)}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              disabled={!canGoForward}
              onClick={(event) => {
                event.preventDefault();
                if (canGoForward) onPageChange(pageInfo.page + 1);
              }}
            >
              {t.sessions_pagination_next()}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function createPaginationItems(
  page: number,
  totalPages: number,
): Array<"ellipsis-end" | "ellipsis-start" | number> {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, page, page - 1, page + 1]);

  if (page <= 4) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
    pages.add(5);
  }

  if (page >= totalPages - 3) {
    pages.add(totalPages - 4);
    pages.add(totalPages - 3);
    pages.add(totalPages - 2);
    pages.add(totalPages - 1);
  }

  const visiblePages = [...pages]
    .filter((visiblePage) => visiblePage >= 1 && visiblePage <= totalPages)
    .sort((a, b) => a - b);
  const items: Array<"ellipsis-end" | "ellipsis-start" | number> = [];

  for (const visiblePage of visiblePages) {
    const previousItem = items.at(-1);
    if (typeof previousItem === "number" && visiblePage - previousItem > 1) {
      items.push(previousItem === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    items.push(visiblePage);
  }

  return items;
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

export function findFilterLabel(filters: SessionFilterOption[], value: string): string {
  return filters.find((filter) => filter.value === value)?.label ?? value;
}
