import { BoxesIcon, FileCogIcon, TerminalSquareIcon, type LucideIcon } from "lucide-react";

type NavigationLabelKey =
  | "dashboard_nav_config"
  | "dashboard_nav_dashboard"
  | "dashboard_nav_sessions";

export const routeLabelKeys = {
  "/": "dashboard_nav_dashboard",
  "/config": "dashboard_nav_config",
  "/sessions": "dashboard_nav_sessions",
} as const;

export type RuntimePath = keyof typeof routeLabelKeys;

export type MainNavItem = {
  icon: LucideIcon;
  labelKey: NavigationLabelKey;
  to: RuntimePath;
};

export const mainNavItems: MainNavItem[] = [
  {
    icon: BoxesIcon,
    labelKey: "dashboard_nav_dashboard",
    to: "/",
  },
  {
    icon: TerminalSquareIcon,
    labelKey: "dashboard_nav_sessions",
    to: "/sessions",
  },
  {
    icon: FileCogIcon,
    labelKey: "dashboard_nav_config",
    to: "/config",
  },
];

export function isRuntimePath(pathname: string): pathname is RuntimePath {
  return pathname in routeLabelKeys;
}

export function getActiveRuntimePath(pathname: string): RuntimePath {
  if (isRuntimePath(pathname)) return pathname;
  if (pathname.startsWith("/sessions/")) return "/sessions";
  return "/";
}
