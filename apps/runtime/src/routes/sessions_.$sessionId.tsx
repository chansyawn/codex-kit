import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sessions_/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  return <section aria-hidden="true" className="hidden" />;
}
