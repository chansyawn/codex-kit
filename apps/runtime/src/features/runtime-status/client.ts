import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

type HealthResponse = InferResponseType<typeof runtimeApiClient.health.$get>;

export function readHealth(): Promise<HealthResponse> {
  return readRuntimeApiJson<HealthResponse>(runtimeApiClient.health.$get());
}
