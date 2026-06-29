"use client";

import { Link } from "@tanstack/react-router";
import { BoxesIcon, LifeBuoyIcon, SendIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { NavMain } from "@/app/layout/nav-main";
import { NavSecondary } from "@/app/layout/nav-secondary";
import { mainNavItems, type RuntimePath } from "@/app/layout/navigation";
import { m } from "@/locales/paraglide/messages";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

const secondaryNavItems = [
  {
    icon: <LifeBuoyIcon aria-hidden="true" />,
    title: () => m.sidebar_support(),
    url: "https://github.com/openai/codex",
  },
  {
    icon: <SendIcon aria-hidden="true" />,
    title: () => m.sidebar_feedback(),
    url: "https://github.com/openai/codex/issues",
  },
];

type AppSidebarProps = ComponentProps<typeof Sidebar> & {
  activePath: RuntimePath;
};

export function AppSidebar({ activePath, ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />}>
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <BoxesIcon className="size-4" aria-hidden="true" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">CodexKit</span>
                <span className="truncate text-xs">{m.sidebar_product_subtitle()}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain activePath={activePath} items={mainNavItems} />
        <NavSecondary items={secondaryNavItems} className="mt-auto" />
      </SidebarContent>
    </Sidebar>
  );
}
