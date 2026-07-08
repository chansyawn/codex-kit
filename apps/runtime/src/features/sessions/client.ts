import type { ThreadReadResponse } from "@codexkit/app-server-protocol/v2";
import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";
import type { SessionListQuery } from "@/features/sessions/model";

type SessionsResponse = InferResponseType<typeof runtimeApiClient.sessions.$get>;
type SessionsFiltersResponse = InferResponseType<typeof runtimeApiClient.sessions.filters.$get>;
type OpenDeeplinkResponse = InferResponseType<typeof runtimeApiClient.deeplinks.open.$post>;

export type ReadSessionsQuery = Pick<
  SessionListQuery,
  | "archived"
  | "lastActivityFrom"
  | "lastActivityTo"
  | "page"
  | "perPage"
  | "project"
  | "provider"
  | "title"
>;

export type ReadSessionFiltersQuery = Pick<SessionListQuery, "lastActivityFrom" | "lastActivityTo">;

export function readSessions(query: ReadSessionsQuery): Promise<SessionsResponse> {
  return readRuntimeApiJson<SessionsResponse>(
    runtimeApiClient.sessions.$get({
      query: createSessionsQueryParams(query),
    }),
  );
}

export function readSessionFilters(
  query: ReadSessionFiltersQuery = {},
): Promise<SessionsFiltersResponse> {
  return readRuntimeApiJson<SessionsFiltersResponse>(
    runtimeApiClient.sessions.filters.$get({
      query: createTimeRangeQueryParams(query),
    }),
  );
}

export function readSessionDetail(sessionId: string): Promise<ThreadReadResponse> {
  return readRuntimeApiJson<ThreadReadResponse>(
    runtimeApiClient.sessions[":sessionId"].$get({
      param: { sessionId },
    }),
  );
}

export async function openDeeplink(href: string): Promise<OpenDeeplinkResponse> {
  return readRuntimeApiJson<OpenDeeplinkResponse>(
    runtimeApiClient.deeplinks.open.$post({
      json: { href },
    }),
  );
}

function createSessionsQueryParams(query: ReadSessionsQuery) {
  return {
    ...(query.archived === undefined ? {} : { archived: String(query.archived) }),
    ...createTimeRangeQueryParams(query),
    page: String(query.page),
    perPage: String(query.perPage),
    ...(query.project.length === 0 ? {} : { project: query.project }),
    ...(query.provider.length === 0 ? {} : { provider: query.provider }),
    ...(query.title ? { title: query.title } : {}),
  };
}

function createTimeRangeQueryParams(query: ReadSessionFiltersQuery) {
  return {
    ...(query.lastActivityFrom ? { lastActivityFrom: query.lastActivityFrom } : {}),
    ...(query.lastActivityTo ? { lastActivityTo: query.lastActivityTo } : {}),
  };
}
