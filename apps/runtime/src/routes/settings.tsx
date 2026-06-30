import { createFileRoute } from "@tanstack/react-router";
import { Settings2Icon } from "lucide-react";

import { PlaceholderPage } from "@/app/layout/placeholder-page";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useRuntimeI18n();

  return (
    <PlaceholderPage
      icon={<Settings2Icon aria-hidden="true" />}
      title={t.dashboard_nav_settings()}
      description={t.settings_placeholder_detail()}
    />
  );
}
