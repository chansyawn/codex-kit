import { BoxesIcon, CheckCircle2Icon, LanguagesIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { RuntimeLocale } from "@/features/settings/model";
import { m } from "@/locales/paraglide/messages";
import { Button } from "@/ui/components/button";
import { cn } from "@/ui/lib/utils";

type DashboardHeaderProps = {
  currentLocale: RuntimeLocale;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSelectLocale: (locale: RuntimeLocale) => void;
};

export function DashboardHeader({
  currentLocale,
  isRefreshing,
  onRefresh,
  onSelectLocale,
}: DashboardHeaderProps) {
  return (
    <header className="border-border flex items-center justify-between gap-4 border-b pb-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
          <BoxesIcon aria-hidden="true" />
        </span>
        <span>CodexKit</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <LanguageSwitcher currentLocale={currentLocale} onSelectLocale={onSelectLocale} />
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCwIcon data-icon="inline-start" className={cn(isRefreshing && "animate-spin")} />
          {m.refresh()}
        </Button>
      </div>
    </header>
  );
}

type LanguageSwitcherProps = {
  currentLocale: RuntimeLocale;
  onSelectLocale: (locale: RuntimeLocale) => void;
};

function LanguageSwitcher({ currentLocale, onSelectLocale }: LanguageSwitcherProps) {
  return (
    <div
      aria-label={m.language_label()}
      className="border-border inline-flex h-8 items-center rounded-lg border"
    >
      <LanguagesIcon className="text-muted-foreground ms-2 size-4" aria-hidden="true" />
      <LanguageButton currentLocale={currentLocale} locale="en" onSelectLocale={onSelectLocale}>
        {m.language_english()}
      </LanguageButton>
      <LanguageButton currentLocale={currentLocale} locale="zh-CN" onSelectLocale={onSelectLocale}>
        {m.language_chinese()}
      </LanguageButton>
    </div>
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
