import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BoxesIcon,
  CheckCircle2Icon,
  FileCogIcon,
  LanguagesIcon,
  RefreshCwIcon,
  ServerIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { readConfigOverview, readHealth, readSessions } from "@/app/codexkit-api";
import { useRuntimeSettings } from "@/app/settings";
import { m } from "@/paraglide/messages";
import type { RuntimeLocale } from "@/shared/settings";
import { Button } from "@/ui/components/button";
import { cn } from "@/ui/lib/utils";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const healthQuery = useQuery({
    queryFn: readHealth,
    queryKey: ["health"],
  });
  const sessionsQuery = useQuery({
    queryFn: readSessions,
    queryKey: ["sessions"],
  });
  const configQuery = useQuery({
    queryFn: readConfigOverview,
    queryKey: ["config-overview"],
  });

  const isRefreshing = healthQuery.isFetching || sessionsQuery.isFetching || configQuery.isFetching;
  const {
    settings: { locale },
    setLocalePreference,
  } = useRuntimeSettings();

  return (
    <main className="bg-background text-foreground min-h-svh">
      <section className="mx-auto flex min-h-svh w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="border-border flex items-center justify-between gap-4 border-b pb-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <BoxesIcon aria-hidden="true" />
            </span>
            <span>CodexKit</span>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              aria-label={m.language_label()}
              className="border-border inline-flex h-8 items-center rounded-lg border"
            >
              <LanguagesIcon className="text-muted-foreground ms-2 size-4" aria-hidden="true" />
              <LanguageButton
                currentLocale={locale}
                locale="en"
                onSelectLocale={setLocalePreference}
              >
                {m.language_english()}
              </LanguageButton>
              <LanguageButton
                currentLocale={locale}
                locale="zh-CN"
                onSelectLocale={setLocalePreference}
              >
                {m.language_chinese()}
              </LanguageButton>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void healthQuery.refetch();
                void sessionsQuery.refetch();
                void configQuery.refetch();
              }}
            >
              <RefreshCwIcon
                data-icon="inline-start"
                className={cn(isRefreshing && "animate-spin")}
              />
              {m.refresh()}
            </Button>
          </div>
        </header>

        <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-5">
            <section className="grid gap-5 md:grid-cols-3">
              <StatusPanel
                icon={<ServerIcon aria-hidden="true" />}
                label={m.runtime_label()}
                value={healthQuery.data?.ok ? m.runtime_online() : m.runtime_waiting()}
                detail={
                  healthQuery.data ? `v${healthQuery.data.version}` : m.runtime_start_server()
                }
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
                      <span className="bg-muted rounded-md px-2 py-1 text-xs">
                        {session.source}
                      </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <Metadata label={m.session_id_label()} value={session.id} />
                      <Metadata
                        label={m.branch_label()}
                        value={session.branch ?? m.branch_none()}
                      />
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
        </div>
      </section>
    </main>
  );
}

type LanguageButtonProps = {
  children: ReactNode;
  currentLocale: RuntimeLocale;
  locale: RuntimeLocale;
  onSelectLocale: (locale: RuntimeLocale) => void;
};

function LanguageButton({ children, currentLocale, locale, onSelectLocale }: LanguageButtonProps) {
  const isActive = currentLocale === locale;

  return (
    <button
      type="button"
      aria-pressed={isActive}
      className={cn(
        "h-full px-2 text-xs font-medium transition-colors",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      onClick={() => {
        onSelectLocale(locale);
      }}
    >
      {children}
    </button>
  );
}

type StatusPanelProps = {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
};

function StatusPanel({ detail, icon, label, value }: StatusPanelProps) {
  return (
    <article className="bg-card rounded-lg border p-4">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <p className="text-muted-foreground mt-1 text-sm">{detail}</p>
    </article>
  );
}

type SectionHeadingProps = {
  detail: string;
  title: string;
};

function SectionHeading({ detail, title }: SectionHeadingProps) {
  return (
    <div>
      <h1 className="text-base font-semibold">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm">{detail}</p>
    </div>
  );
}

type MetadataProps = {
  label: string;
  value: string;
};

function Metadata({ label, value }: MetadataProps) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium break-all">{value}</dd>
    </div>
  );
}

type ConfigGroupProps = {
  entries?: { label: string; value: string }[];
  title: string;
};

function ConfigGroup({ entries = [], title }: ConfigGroupProps) {
  return (
    <article className="bg-card rounded-lg border p-4">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-4 grid gap-3">
        {entries.map((entry) => (
          <div
            key={`${entry.label}-${entry.value}`}
            className="flex items-start justify-between gap-4"
          >
            <span className="text-muted-foreground min-w-0 text-sm break-all">{entry.label}</span>
            <span className="bg-muted shrink-0 rounded-md px-2 py-1 text-xs">{entry.value}</span>
          </div>
        ))}
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">{m.waiting_for_runtime_data()}</p>
        ) : null}
      </div>
    </article>
  );
}

type CallFlowStepProps = {
  label: string;
  value: string;
};

function CallFlowStep({ label, value }: CallFlowStepProps) {
  return (
    <article className="bg-card flex items-start gap-3 rounded-lg border p-3">
      <CheckCircle2Icon className="text-primary mt-0.5 size-4" aria-hidden="true" />
      <div className="min-w-0">
        <h2 className="text-sm font-medium">{label}</h2>
        <p className="text-muted-foreground mt-1 text-sm break-all">{value}</p>
      </div>
    </article>
  );
}

function ErrorState({ message }: { message: string }) {
  return <p className="text-destructive text-sm">{message}</p>;
}
