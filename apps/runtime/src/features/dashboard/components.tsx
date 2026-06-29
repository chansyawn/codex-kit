import { CheckCircle2Icon } from "lucide-react";
import type { ReactNode } from "react";

import { m } from "@/locales/paraglide/messages";

type StatusPanelProps = {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
};

export function StatusPanel({ detail, icon, label, value }: StatusPanelProps) {
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

export function SectionHeading({ detail, title }: SectionHeadingProps) {
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

export function Metadata({ label, value }: MetadataProps) {
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

export function ConfigGroup({ entries = [], title }: ConfigGroupProps) {
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

export function CallFlowStep({ label, value }: CallFlowStepProps) {
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

export function ErrorState({ message }: { message: string }) {
  return <p className="text-destructive text-sm">{message}</p>;
}
