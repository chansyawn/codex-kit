import { useMemo, useState } from "react";

import {
  findFilterLabel,
  SessionsActiveTags,
  SessionsEmpty,
  SessionsError,
  SessionsFilterSidebar,
  SessionsPageHeader,
  SessionsPagination,
  SessionsSearchBar,
  SessionsSkeleton,
  type SessionTag,
  SessionCard,
  type SessionsTimeRangeValue,
} from "@/features/sessions/components";
import type { SessionListQuery } from "@/features/sessions/model";
import { useSessionFiltersData, useSessionsData } from "@/features/sessions/use-sessions-data";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import { ItemGroup } from "@/ui/components/item";

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;
const EMPTY_FILTERS = {
  archived: [],
  projects: [],
  providers: [],
};

export function SessionsPage() {
  const { t } = useRuntimeI18n();
  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState<string[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [archived, setArchived] = useState<boolean | undefined>();
  const [timeRange, setTimeRange] = useState<SessionsTimeRangeValue>({});
  const [page, setPage] = useState(DEFAULT_PAGE);

  const query = useMemo<SessionListQuery>(
    () => ({
      archived,
      lastActivityFrom: timeRange.lastActivityFrom,
      lastActivityTo: timeRange.lastActivityTo,
      page,
      perPage: DEFAULT_PER_PAGE,
      project: projects,
      provider: providers,
      title,
    }),
    [
      archived,
      page,
      projects,
      providers,
      timeRange.lastActivityFrom,
      timeRange.lastActivityTo,
      title,
    ],
  );
  const { isRefreshing, refresh, sessionsQuery } = useSessionsData(query);
  const filterQuery = useMemo(
    () => ({
      lastActivityFrom: timeRange.lastActivityFrom,
      lastActivityTo: timeRange.lastActivityTo,
    }),
    [timeRange.lastActivityFrom, timeRange.lastActivityTo],
  );
  const { sessionFiltersQuery } = useSessionFiltersData(filterQuery);
  const sessionsResponse = sessionsQuery.data;
  const filters = sessionFiltersQuery.data ?? EMPTY_FILTERS;
  const pageInfo = sessionsResponse?.pageInfo ?? {
    page: DEFAULT_PAGE,
    perPage: DEFAULT_PER_PAGE,
    total: 0,
    totalPages: 0,
  };

  const tags = useMemo<SessionTag[]>(
    () => [
      ...projects.map((project) => ({
        id: `project:${project}`,
        label: `${t.sessions_filter_project()}: ${findFilterLabel(filters.projects, project)}`,
        onRemove: () => removeProject(project),
      })),
      ...providers.map((provider) => ({
        id: `provider:${provider}`,
        label: `${t.sessions_filter_provider()}: ${findFilterLabel(filters.providers, provider)}`,
        onRemove: () => removeProvider(provider),
      })),
      ...(archived === undefined
        ? []
        : [
            {
              id: `archived:${String(archived)}`,
              label: `${t.sessions_filter_archived_state()}: ${
                archived ? t.session_status_archived() : t.session_status_active()
              }`,
              onRemove: clearArchived,
            },
          ]),
    ],
    [archived, filters.projects, filters.providers, projects, providers, t],
  );

  function resetPage(): void {
    setPage(DEFAULT_PAGE);
  }

  function updateTitle(value: string): void {
    setTitle(value);
    resetPage();
  }

  function toggleProject(project: string): void {
    setProjects((currentProjects) => toggleValue(currentProjects, project));
    resetPage();
  }

  function removeProject(project: string): void {
    setProjects((currentProjects) =>
      currentProjects.filter((currentProject) => currentProject !== project),
    );
    resetPage();
  }

  function toggleProvider(provider: string): void {
    setProviders((currentProviders) => toggleValue(currentProviders, provider));
    resetPage();
  }

  function removeProvider(provider: string): void {
    setProviders((currentProviders) =>
      currentProviders.filter((currentProvider) => currentProvider !== provider),
    );
    resetPage();
  }

  function updateArchived(value: boolean): void {
    setArchived((currentArchived) => (currentArchived === value ? undefined : value));
    resetPage();
  }

  function clearArchived(): void {
    setArchived(undefined);
    resetPage();
  }

  function updateTimeRange(value: SessionsTimeRangeValue): void {
    setTimeRange(value);
    resetPage();
  }

  return (
    <>
      <SessionsPageHeader isRefreshing={isRefreshing} onRefresh={refresh} />

      <div className="grid gap-5 lg:flex lg:items-start">
        <SessionsFilterSidebar
          archived={archived}
          filters={filters}
          isError={sessionFiltersQuery.isError}
          isLoading={sessionFiltersQuery.isLoading}
          projects={projects}
          providers={providers}
          timeRange={timeRange}
          onArchivedChange={updateArchived}
          onProjectToggle={toggleProject}
          onProviderToggle={toggleProvider}
          onTimeRangeChange={updateTimeRange}
        />

        <section className="grid min-w-0 flex-1 gap-4">
          <div className="grid gap-3">
            <SessionsSearchBar title={title} onTitleChange={updateTitle} />
            <SessionsActiveTags tags={tags} />
          </div>

          <div className="grid gap-3">
            {sessionsQuery.isError ? <SessionsError message={t.sessions_load_error()} /> : null}
            {!sessionsQuery.isError && sessionsQuery.isLoading ? <SessionsSkeleton /> : null}
            {!sessionsQuery.isError &&
            !sessionsQuery.isLoading &&
            sessionsResponse &&
            sessionsResponse.data.length === 0 ? (
              <SessionsEmpty message={t.sessions_empty()} />
            ) : null}
            {sessionsResponse && sessionsResponse.data.length > 0 ? (
              <ItemGroup className="gap-3">
                {sessionsResponse.data.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </ItemGroup>
            ) : null}
          </div>

          {!sessionsQuery.isError && !sessionsQuery.isLoading ? (
            <SessionsPagination pageInfo={pageInfo} onPageChange={setPage} />
          ) : null}
        </section>
      </div>
    </>
  );
}

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}
