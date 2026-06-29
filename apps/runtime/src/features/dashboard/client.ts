import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

type DashboardResponse = InferResponseType<typeof runtimeApiClient.dashboard.$get>;

export function readDashboard(): Promise<DashboardResponse> {
  return readRuntimeApiJson<DashboardResponse>(runtimeApiClient.dashboard.$get());
}
