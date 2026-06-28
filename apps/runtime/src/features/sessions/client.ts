import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

type SessionsResponse = InferResponseType<typeof runtimeApiClient.sessions.$get>;

export function readSessions(): Promise<SessionsResponse> {
  return readRuntimeApiJson<SessionsResponse>(runtimeApiClient.sessions.$get());
}
