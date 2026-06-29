import { createFileRoute } from "@tanstack/react-router";
import { TerminalSquareIcon } from "lucide-react";

import { PlaceholderPage } from "@/app/layout/placeholder-page";
import { m } from "@/locales/paraglide/messages";

export const Route = createFileRoute("/sessions")({
  component: SessionsPage,
});

function SessionsPage() {
  return (
    <PlaceholderPage
      icon={<TerminalSquareIcon aria-hidden="true" />}
      title={m.dashboard_nav_sessions()}
      description={m.sessions_placeholder_detail()}
    />
  );
}
