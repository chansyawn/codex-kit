import { createFileRoute } from "@tanstack/react-router";

import { SessionDetailPage } from "@/features/sessions/session-detail-page";

export const Route = createFileRoute("/sessions_/$sessionId")({
  component: SessionRoute,
});

function SessionRoute() {
  const { sessionId } = Route.useParams();

  return <SessionDetailPage sessionId={sessionId} />;
}
