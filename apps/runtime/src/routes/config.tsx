import { createFileRoute } from "@tanstack/react-router";
import { FileCogIcon } from "lucide-react";

import { PlaceholderPage } from "@/app/layout/placeholder-page";
import { useRuntimeI18n } from "@/features/settings/i18n-provider";

export const Route = createFileRoute("/config")({
  component: ConfigPage,
});

function ConfigPage() {
  const { t } = useRuntimeI18n();

  return (
    <PlaceholderPage
      icon={<FileCogIcon aria-hidden="true" />}
      title={t.dashboard_nav_config()}
      description={t.config_placeholder_detail()}
    />
  );
}
