import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LanguagesIcon } from "lucide-react";

import { AppSidebar } from "@/app/layout/app-sidebar";
import { isRuntimePath, routeLabels } from "@/app/layout/navigation";
import { useRuntimeLocale } from "@/features/settings/client-provider";
import type { RuntimeLocale } from "@/features/settings/model";
import { m } from "@/locales/paraglide/messages";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/components/breadcrumb";
import { Separator } from "@/ui/components/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/ui/components/sidebar";
import { cn } from "@/ui/lib/utils";

export function AppShell() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activePath = isRuntimePath(pathname) ? pathname : "/";
  const { locale, setLocalePreference } = useRuntimeLocale();

  return (
    <SidebarProvider>
      <AppSidebar activePath={activePath} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="-ms-1" />
            <Separator orientation="vertical" className="me-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink render={<Link to="/" />}>CodexKit</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{routeLabels[activePath]()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher currentLocale={locale} onSelectLocale={setLocalePreference} />
          </div>
        </header>
        <div className="flex flex-1 flex-col p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
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
  children: string;
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
