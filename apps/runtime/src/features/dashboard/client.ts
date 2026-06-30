import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";
import type { DashboardRange } from "@/features/dashboard/model";

type DashboardResponse = InferResponseType<typeof runtimeApiClient.dashboard.$get>;

export function readDashboard(range: DashboardRange): Promise<DashboardResponse> {
  return readRuntimeApiJson<DashboardResponse>(
    runtimeApiClient.dashboard.$get({
      query: { range },
    }),
  );
}
