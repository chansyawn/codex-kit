import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  BoxesIcon,
  CheckCircle2Icon,
  FileCogIcon,
  RefreshCwIcon,
  ServerIcon,
  TerminalSquareIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { readConfigOverview, readHealth, readSessions } from "@/app/codexkit-api";
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
            Refresh
          </Button>
        </header>

        <div className="grid gap-5 py-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid gap-5">
            <section className="grid gap-5 md:grid-cols-3">
              <StatusPanel
                icon={<ServerIcon aria-hidden="true" />}
                label="Runtime"
                value={healthQuery.data?.ok ? "Online" : "Waiting"}
                detail={healthQuery.data ? `v${healthQuery.data.version}` : "Start codexkit server"}
              />
              <StatusPanel
                icon={<TerminalSquareIcon aria-hidden="true" />}
                label="Sessions"
                value={`${sessionsQuery.data?.length ?? 0}`}
                detail="Loaded from /api/sessions"
              />
              <StatusPanel
                icon={<FileCogIcon aria-hidden="true" />}
                label="Config"
                value={`${configQuery.data?.projects.length ?? 0}`}
                detail="Project entries detected"
              />
            </section>

            <section className="grid gap-3">
              <SectionHeading
                title="Session Viewer"
                detail="Codex session metadata surfaced by the runtime."
              />
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
                      <Metadata label="Session ID" value={session.id} />
                      <Metadata label="Branch" value={session.branch ?? "none"} />
                      <Metadata label="Last activity" value={session.lastActivityAt} />
                    </dl>
                  </article>
                ))}
                {sessionsQuery.isError ? <ErrorState message="Unable to load sessions." /> : null}
              </div>
            </section>

            <section className="grid gap-3">
              <SectionHeading
                title="Config Manager"
                detail={configQuery.data?.sourcePath ?? "~/.codex/config.toml"}
              />
              <div className="grid gap-3 lg:grid-cols-2">
                <ConfigGroup
                  title="Global"
                  entries={configQuery.data?.global.map((entry) => ({
                    label: entry.key,
                    value: entry.valuePreview,
                  }))}
                />
                <ConfigGroup
                  title="Projects"
                  entries={configQuery.data?.projects.map((project) => ({
                    label: project.path,
                    value: project.trustedLevel ?? "configured",
                  }))}
                />
              </div>
              {configQuery.isError ? (
                <ErrorState message="Unable to load config overview." />
              ) : null}
            </section>
          </div>

          <aside className="grid content-start gap-3">
            <SectionHeading title="Call Flow" detail="Thin plugin, local runtime, browser UI." />
            <CallFlowStep label="Plugin hook" value="SessionStart" />
            <CallFlowStep label="CLI command" value="codexkit open" />
            <CallFlowStep label="CLI wrapper" value="@codexkit/cli" />
            <CallFlowStep label="App runtime" value="@codexkit/runtime" />
            <CallFlowStep label="App path" value="apps/runtime" />
            <CallFlowStep label="Runtime route" value="Hono /api/*" />
          </aside>
        </div>
      </section>
    </main>
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
          <p className="text-muted-foreground text-sm">Waiting for runtime data.</p>
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
