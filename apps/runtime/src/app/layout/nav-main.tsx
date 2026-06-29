"use client";

import { Link } from "@tanstack/react-router";

import type { MainNavItem, RuntimePath } from "@/app/layout/navigation";
import { m } from "@/locales/paraglide/messages";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

export function NavMain({ activePath, items }: { activePath: RuntimePath; items: MainNavItem[] }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{m.sidebar_navigation()}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              isActive={activePath === item.to}
              tooltip={item.label()}
              render={<Link to={item.to} />}
            >
              <item.icon aria-hidden="true" />
              <span>{item.label()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
