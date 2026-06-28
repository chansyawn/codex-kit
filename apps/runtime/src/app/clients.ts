import { hc } from "hono/client";

import type { RuntimeApi } from "@/server/api";

export const runtimeApiClient = hc<RuntimeApi>("/api");

export async function readRuntimeApiJson<TData>(request: Promise<Response>): Promise<TData> {
  const response = await request;

  if (!response.ok) {
    throw new Error(`CodexKit API request failed: ${response.status}`);
  }

  return response.json() as Promise<TData>;
}
