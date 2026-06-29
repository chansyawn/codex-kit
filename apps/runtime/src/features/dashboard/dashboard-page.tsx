import { FileCogIcon, ServerIcon, TerminalSquareIcon } from "lucide-react";

import {
  CallFlowStep,
  ConfigGroup,
  ErrorState,
  Metadata,
  SectionHeading,
  StatusPanel,
} from "@/features/dashboard/components";
import { useDashboardData } from "@/features/dashboard/use-dashboard-data";
import { m } from "@/locales/paraglide/messages";

export function DashboardPage() {
  const { configQuery, healthQuery, sessionsQuery } = useDashboardData();

  return (
    <section className="grid gap-5 py-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid gap-5">
        <section className="grid gap-5 md:grid-cols-3">
          <StatusPanel
            icon={<ServerIcon aria-hidden="true" />}
            label={m.runtime_label()}
            value={healthQuery.data?.ok ? m.runtime_online() : m.runtime_waiting()}
            detail={healthQuery.data ? `v${healthQuery.data.version}` : m.runtime_start_server()}
          />
          <StatusPanel
            icon={<TerminalSquareIcon aria-hidden="true" />}
            label={m.sessions_label()}
            value={`${sessionsQuery.data?.length ?? 0}`}
            detail={m.sessions_loaded_detail()}
          />
          <StatusPanel
            icon={<FileCogIcon aria-hidden="true" />}
            label={m.config_label()}
            value={`${configQuery.data?.projects.length ?? 0}`}
            detail={m.config_projects_detected()}
          />
        </section>

        <section className="grid gap-3">
          <SectionHeading title={m.session_viewer_title()} detail={m.session_viewer_detail()} />
          <div className="grid gap-3">
            {(sessionsQuery.data ?? []).map((session) => (
              <article key={session.id} className="bg-card rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-medium">{session.title}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{session.cwd}</p>
                  </div>
                  <span className="bg-muted rounded-md px-2 py-1 text-xs">{session.source}</span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <Metadata label={m.session_id_label()} value={session.id} />
                  <Metadata label={m.branch_label()} value={session.branch ?? m.branch_none()} />
                  <Metadata label={m.last_activity_label()} value={session.lastActivityAt} />
                </dl>
              </article>
            ))}
            {sessionsQuery.isError ? <ErrorState message={m.sessions_load_error()} /> : null}
          </div>
        </section>

        <section className="grid gap-3">
          <SectionHeading
            title={m.config_manager_title()}
            detail={configQuery.data?.sourcePath ?? "~/.codex/config.toml"}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <ConfigGroup
              title={m.global_config_title()}
              entries={configQuery.data?.global.map((entry) => ({
                label: entry.key,
                value: entry.valuePreview,
              }))}
            />
            <ConfigGroup
              title={m.projects_config_title()}
              entries={configQuery.data?.projects.map((project) => ({
                label: project.path,
                value: project.trustedLevel ?? m.configured_value(),
              }))}
            />
          </div>
          {configQuery.isError ? <ErrorState message={m.config_overview_load_error()} /> : null}
        </section>
      </div>

      <aside className="grid content-start gap-3">
        <SectionHeading title={m.call_flow_title()} detail={m.call_flow_detail()} />
        <CallFlowStep label={m.plugin_hook_label()} value="SessionStart" />
        <CallFlowStep label={m.cli_command_label()} value="codexkit open" />
        <CallFlowStep label={m.cli_wrapper_label()} value="@codexkit/cli" />
        <CallFlowStep label={m.app_runtime_label()} value="@codexkit/runtime" />
        <CallFlowStep label={m.app_path_label()} value="apps/runtime" />
        <CallFlowStep label={m.runtime_route_label()} value="Hono /api/*" />
      </aside>
    </section>
  );
}
