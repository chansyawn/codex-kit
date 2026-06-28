import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

type ConfigOverviewResponse = InferResponseType<typeof runtimeApiClient.config.overview.$get>;

export function readConfigOverview(): Promise<ConfigOverviewResponse> {
  return readRuntimeApiJson<ConfigOverviewResponse>(runtimeApiClient.config.overview.$get());
}
