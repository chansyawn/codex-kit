"use client";

import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

import { NavMain } from "@/app/layout/nav-main";
import { mainNavItems, type RuntimePath } from "@/app/layout/navigation";
import { SidebarPreferences } from "@/app/layout/sidebar-preferences";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  activePath: RuntimePath;
};

export function AppSidebar({ activePath, ...props }: AppSidebarProps) {
  const { t } = useRuntimeI18n();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <img src="/favicon.svg" alt="" aria-hidden="true" className="size-8 rounded-lg" />
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">CodexKit</span>
                <span className="truncate text-xs">{t.sidebar_product_subtitle()}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain activePath={activePath} items={mainNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarPreferences />
      </SidebarFooter>
    </Sidebar>
  );
}
