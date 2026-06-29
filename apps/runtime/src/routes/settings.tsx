import { createFileRoute } from "@tanstack/react-router";
import { Settings2Icon } from "lucide-react";

import { PlaceholderPage } from "@/app/layout/placeholder-page";
import { m } from "@/locales/paraglide/messages";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <PlaceholderPage
      icon={<Settings2Icon aria-hidden="true" />}
      title={m.dashboard_nav_settings()}
      description={m.settings_placeholder_detail()}
    />
  );
}
