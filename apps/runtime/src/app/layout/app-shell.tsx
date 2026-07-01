import { Link, Outlet, useRouterState } from "@tanstack/react-router";

import { AppSidebar } from "@/app/layout/app-sidebar";
import { getActiveRuntimePath, routeLabelKeys } from "@/app/layout/navigation";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
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

export function AppShell() {
  const { t } = useRuntimeI18n();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const activePath = getActiveRuntimePath(pathname);
  const activeLabel = t[routeLabelKeys[activePath]]();

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
                  <BreadcrumbPage>{activeLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="container mx-auto grid w-full flex-1 content-start gap-5 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
