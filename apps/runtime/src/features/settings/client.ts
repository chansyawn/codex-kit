import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";

import type { RuntimeSettingsPatch } from "./model";

type SettingsResponse = InferResponseType<typeof runtimeApiClient.settings.$get>;

export function readSettings(): Promise<SettingsResponse> {
  return readRuntimeApiJson<SettingsResponse>(runtimeApiClient.settings.$get());
}

export function patchSettings(patch: RuntimeSettingsPatch): Promise<SettingsResponse> {
  return readRuntimeApiJson<SettingsResponse>(runtimeApiClient.settings.$patch({ json: patch }));
}
