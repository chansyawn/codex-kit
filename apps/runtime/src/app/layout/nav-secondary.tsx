import type { ComponentPropsWithoutRef, ReactNode } from "react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/components/sidebar";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    icon: ReactNode;
    title: () => string;
    url: string;
  }[];
} & ComponentPropsWithoutRef<typeof SidebarGroup>) {
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const title = item.title();

            return (
              <SidebarMenuItem key={title}>
                <SidebarMenuButton size="sm" render={<a href={item.url} />}>
                  {item.icon}
                  <span>{title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
