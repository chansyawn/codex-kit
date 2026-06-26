import type { ConfigOverview, HealthResponse, SessionSummary } from "@/shared/api";

async function readJson<TData>(path: string): Promise<TData> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`CodexKit API request failed: ${response.status}`);
  }

  return response.json() as Promise<TData>;
}

export function readHealth(): Promise<HealthResponse> {
  return readJson<HealthResponse>("/api/health");
}

export function readSessions(): Promise<SessionSummary[]> {
  return readJson<SessionSummary[]>("/api/sessions");
}

export function readConfigOverview(): Promise<ConfigOverview> {
  return readJson<ConfigOverview>("/api/config/overview");
}
