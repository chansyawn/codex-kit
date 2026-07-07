import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

import type { CodexConfigPatch } from "./model";

type ConfigResponse = InferResponseType<typeof runtimeApiClient.config.$get>;

export function readConfig(): Promise<ConfigResponse> {
  return readRuntimeApiJson<ConfigResponse>(runtimeApiClient.config.$get());
}

export function patchConfig(patch: CodexConfigPatch): Promise<ConfigResponse> {
  return readRuntimeApiJson<ConfigResponse>(runtimeApiClient.config.$patch({ json: patch }));
}
