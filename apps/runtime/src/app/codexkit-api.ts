import { hc, type InferResponseType } from "hono/client";

import type { RuntimeApi } from "@/server/api";

const client = hc<RuntimeApi>("/api");

type HealthResponse = InferResponseType<typeof client.health.$get>;
type SessionsResponse = InferResponseType<typeof client.sessions.$get>;
type ConfigOverviewResponse = InferResponseType<typeof client.config.overview.$get>;

async function readJson<TData>(request: Promise<Response>): Promise<TData> {
  const response = await request;

  if (!response.ok) {
    throw new Error(`CodexKit API request failed: ${response.status}`);
  }

  return response.json() as Promise<TData>;
}

export function readHealth(): Promise<HealthResponse> {
  return readJson<HealthResponse>(client.health.$get());
}

export function readSessions(): Promise<SessionsResponse> {
  return readJson<SessionsResponse>(client.sessions.$get());
}

export function readConfigOverview(): Promise<ConfigOverviewResponse> {
  return readJson<ConfigOverviewResponse>(client.config.overview.$get());
}
