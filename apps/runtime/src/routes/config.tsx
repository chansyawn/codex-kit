import { createFileRoute } from "@tanstack/react-router";
import { FileCogIcon } from "lucide-react";

import { PlaceholderPage } from "@/app/layout/placeholder-page";
import { m } from "@/locales/paraglide/messages";

export const Route = createFileRoute("/config")({
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <PlaceholderPage
      icon={<FileCogIcon aria-hidden="true" />}
      title={m.dashboard_nav_config()}
      description={m.config_placeholder_detail()}
    />
  );
}
