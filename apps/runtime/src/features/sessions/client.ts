import { type InferResponseType } from "hono/client";

import { readRuntimeApiJson, runtimeApiClient } from "@/app/clients";
import type { SessionListQuery } from "@/features/sessions/model";

type SessionsResponse = InferResponseType<typeof runtimeApiClient.sessions.$get>;
type SessionsFiltersResponse = InferResponseType<typeof runtimeApiClient.sessions.filters.$get>;

export type ReadSessionsQuery = Pick<
  SessionListQuery,
  "archived" | "page" | "perPage" | "project" | "provider" | "title"
>;

export function readSessions(query: ReadSessionsQuery): Promise<SessionsResponse> {
  return readRuntimeApiJson<SessionsResponse>(
    runtimeApiClient.sessions.$get({
      query: createSessionsQueryParams(query),
    }),
  );
}

export function readSessionFilters(): Promise<SessionsFiltersResponse> {
  return readRuntimeApiJson<SessionsFiltersResponse>(runtimeApiClient.sessions.filters.$get());
}

function createSessionsQueryParams(query: ReadSessionsQuery) {
  return {
    ...(query.archived === undefined ? {} : { archived: String(query.archived) }),
    page: String(query.page),
    perPage: String(query.perPage),
    ...(query.project.length === 0 ? {} : { project: query.project }),
    ...(query.provider.length === 0 ? {} : { provider: query.provider }),
    ...(query.title ? { title: query.title } : {}),
  };
}
