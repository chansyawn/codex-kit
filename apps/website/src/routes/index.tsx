import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRightIcon, BoxesIcon, SparklesIcon, TerminalSquareIcon } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/ui/components/button";
import { cn } from "@/ui/lib/utils";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="bg-background text-foreground min-h-svh">
      <section className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-8 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
              <BoxesIcon aria-hidden="true" />
            </span>
            <span>codex-kit</span>
          </div>
          <a
            className={cn(buttonVariants({ variant: "outline" }))}
            href="https://viteplus.dev/guide/"
            target="_blank"
            rel="noreferrer"
          >
            <TerminalSquareIcon data-icon="inline-start" />
            <Trans id="home.actions.docs">Vite+ docs</Trans>
          </a>
        </header>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-3xl">
            <div className="bg-card text-muted-foreground mb-5 inline-flex items-center gap-2 rounded-lg border px-3 py-1 text-sm">
              <SparklesIcon aria-hidden="true" />
              <Trans id="home.eyebrow">Website shell initialized</Trans>
            </div>
            <h1 className="text-4xl leading-tight font-semibold tracking-normal text-balance sm:text-5xl lg:text-6xl">
              <Trans id="home.title">Build codex-kit from a real application foundation.</Trans>
            </h1>
            <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-8">
              <Trans id="home.description">
                The website app now starts with React, TanStack Router, Lingui, Tailwind, and shared
                UI primitives instead of a demo counter.
              </Trans>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                className={cn(buttonVariants({ size: "lg" }))}
                href="https://tanstack.com/router/latest"
                target="_blank"
                rel="noreferrer"
              >
                <Trans id="home.actions.router">Explore router</Trans>
                <ArrowRightIcon data-icon="inline-end" />
              </a>
              <a
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                href="https://lingui.dev/"
                target="_blank"
                rel="noreferrer"
              >
                <Trans id="home.actions.i18n">Lingui guide</Trans>
              </a>
            </div>
          </div>

          <div className="grid gap-3">
            <FeatureCard
              title={<Trans id="home.features.routing.title">Typed routing</Trans>}
              description={
                <Trans id="home.features.routing.description">
                  File routes are wired through TanStack Router and generated route metadata.
                </Trans>
              }
            />
            <FeatureCard
              title={<Trans id="home.features.design.title">Design primitives</Trans>}
              description={
                <Trans id="home.features.design.description">
                  Tailwind tokens, Base UI components, and lucide icons are ready for product UI.
                </Trans>
              }
            />
            <FeatureCard
              title={<Trans id="home.features.locale.title">Locale aware</Trans>}
              description={
                <Trans id="home.features.locale.description">
                  Theme, language, and text direction preferences are owned by app providers.
                </Trans>
              }
            />
          </div>
        </div>
      </section>
    </main>
  );
}

type FeatureCardProps = {
  title: ReactNode;
  description: ReactNode;
};

function FeatureCard({ title, description }: FeatureCardProps) {
  return (
    <article className="bg-card text-card-foreground rounded-lg border p-5 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm leading-6">{description}</p>
    </article>
  );
}
