import {
  BoxesIcon,
  FileCogIcon,
  Settings2Icon,
  TerminalSquareIcon,
  type LucideIcon,
} from "lucide-react";

import { m } from "@/locales/paraglide/messages";

export const routeLabels = {
  "/": () => m.dashboard_nav_dashboard(),
  "/config": () => m.dashboard_nav_config(),
  "/sessions": () => m.dashboard_nav_sessions(),
  "/settings": () => m.dashboard_nav_settings(),
} as const;

export type RuntimePath = keyof typeof routeLabels;

export type MainNavItem = {
  icon: LucideIcon;
  label: () => string;
  to: RuntimePath;
};

export const mainNavItems: MainNavItem[] = [
  {
    icon: BoxesIcon,
    label: () => m.dashboard_nav_dashboard(),
    to: "/",
  },
  {
    icon: TerminalSquareIcon,
    label: () => m.dashboard_nav_sessions(),
    to: "/sessions",
  },
  {
    icon: FileCogIcon,
    label: () => m.dashboard_nav_config(),
    to: "/config",
  },
  {
    icon: Settings2Icon,
    label: () => m.dashboard_nav_settings(),
    to: "/settings",
  },
];

export function isRuntimePath(pathname: string): pathname is RuntimePath {
  return pathname in routeLabels;
}
