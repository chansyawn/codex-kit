"use client";

import { Link } from "@tanstack/react-router";

import type { MainNavItem, RuntimePath } from "@/app/layout/navigation";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

export function NavMain({ activePath, items }: { activePath: RuntimePath; items: MainNavItem[] }) {
  const { t } = useRuntimeI18n();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t.sidebar_navigation()}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const label = t[item.labelKey]();

          return (
            <SidebarMenuItem key={item.to}>
              <SidebarMenuButton
                isActive={activePath === item.to}
                tooltip={label}
                render={<Link to={item.to} />}
              >
                <item.icon aria-hidden="true" />
                <span>{label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
