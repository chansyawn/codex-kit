---
date: "2026-07-07"
description: "Codex state_5.sqlite thread metadata schema and list semantics"
reference:
  - type: "codex-repository"
    repository: "https://github.com/openai/codex"
    commit: "cca16a10878202cb2f6e9666b6b4330329ea7e65"
    url: "https://github.com/openai/codex/tree/cca16a10878202cb2f6e9666b6b4330329ea7e65"
---

# Codex SQLite State

This document records an internal implementation assumption about Codex
`state_5.sqlite` thread metadata. It is based on the linked Codex source
snapshot and should not be treated as a stable public API contract.

## Database Location

`state_5.sqlite` is the main SQLite state database opened by the
`codex_state::StateRuntime`. The filename is exported as `STATE_DB_FILENAME`.
Codex also opens separate runtime databases for logs, goals, and memories, but
this note only covers thread metadata in `state_5.sqlite`. See
[`lib.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/lib.rs)
and
[`runtime.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/runtime.rs).

The database lives under the Codex SQLite home. Codex exposes
`CODEX_SQLITE_HOME` as the environment variable for overriding that home. Most
local consumers should still treat the file as internal state and prefer
official higher-level APIs when they are sufficient.

## Threads Table

The `threads` table starts in migration `0001_threads.sql` and is extended by
later migrations. Current thread-list code reads these columns through
`ThreadMetadata`:

| Group             | Columns                                                                                     | Meaning                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Identity/path     | `id`, `rollout_path`                                                                        | Thread id and absolute rollout JSONL path.                                                                  |
| Timestamps        | `created_at`, `updated_at`, `recency_at`, `created_at_ms`, `updated_at_ms`, `recency_at_ms` | Second-precision legacy timestamps plus millisecond timestamps used by current listing and cursor ordering. |
| Source/agent      | `source`, `history_mode`, `thread_source`, `agent_nickname`, `agent_role`, `agent_path`     | Session origin, persisted history contract, analytics source, and optional sub-agent metadata.              |
| Model/runtime     | `model_provider`, `model`, `reasoning_effort`, `sandbox_policy`, `approval_mode`            | Provider id, latest observed model, reasoning effort, sandbox, and approval mode.                           |
| Workspace/display | `cwd`, `cli_version`, `title`, `preview`, `first_user_message`                              | Working directory, creating CLI version, user-facing title, list preview, and first user message.           |
| Status/usage      | `tokens_used`, `archived`, `archived_at`, `memory_mode`                                     | Last observed token total, archive state, archive timestamp, and memory processing mode.                    |
| Git               | `git_sha`, `git_branch`, `git_origin_url`                                                   | Git metadata captured or later updated for the thread.                                                      |

Relevant migrations include
[`0001_threads.sql`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/migrations/0001_threads.sql),
[`0025_thread_timestamps_millis.sql`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/migrations/0025_thread_timestamps_millis.sql),
[`0032_threads_preview.sql`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/migrations/0032_threads_preview.sql),
[`0039_threads_recency_at.sql`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/migrations/0039_threads_recency_at.sql),
and
[`0040_threads_history_mode.sql`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/migrations/0040_threads_history_mode.sql).

## Write Semantics

`ThreadMetadataBuilder` creates the base metadata for a rollout-backed thread.
`StateRuntime::apply_rollout_items` then applies rollout items and upserts the
result into `threads`. See
[`thread_metadata.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/model/thread_metadata.rs)
and
[`threads.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/runtime/threads.rs).

Field updates are derived from rollout items in
[`extract.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/extract.rs):

- `session_meta` fills source, thread source, agent metadata, provider, CLI
  version, cwd, and git metadata for matching thread ids.
- `turn_context` fills `model`, `reasoning_effort`, `sandbox_policy`, and
  `approval_mode`; it also fills cwd if cwd was still empty.
- `event_msg` token count updates `tokens_used` from the latest total token
  usage.
- `event_msg` user message fills `first_user_message`, sets `preview` if empty,
  and sets `title` when the title is empty.
- `event_msg` thread goal updates can fill `preview` from a non-empty goal
  objective.

`upsert_thread` preserves existing non-null Git fields when a later rollout
upsert carries stale or missing Git data. It also preserves an existing preview
when the new preview value is empty. Archive and unarchive operations update
`archived` and `archived_at` through metadata upserts.

## List Semantics

The state runtime list path uses `threads` directly. It selects the current
`ThreadMetadata` projection, applies filters, and returns keyset-paginated
pages. The selected timestamp column is one of `created_at_ms`,
`updated_at_ms`, or `recency_at_ms`. `recency_at_ms` uses the thread id as a
tie-breaker; relation-filtered listings also include the thread id tie-breaker.
See `list_threads`, `push_thread_filters`, and `push_thread_order_and_limit` in
[`threads.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/state/src/runtime/threads.rs).

Important current behaviors:

- Listing is always scoped to one archive state: `archived = 0` or
  `archived = 1`.
- Rows with an empty `preview` are excluded from the list path.
- Allowed source filters use `threads.source IN (...)`.
- Provider filters use `threads.model_provider IN (...)`.
- Cwd filters use exact path strings in `threads.cwd IN (...)`.
- Search uses `instr(threads.title, term) > 0 OR instr(threads.preview, term) > 0`.

## CodexKit Differences

CodexKit currently reads `state_5.sqlite` directly for the sessions page. That
implementation is intentionally narrower than Codex's state runtime list
projection:

- CodexKit can represent "all archive states" by omitting the archived filter;
  the Codex state runtime list path chooses either active or archived rows.
- CodexKit currently searches `title` case-insensitively with `lower(title)
LIKE`; Codex state runtime searches both `title` and `preview` with `instr`.
- CodexKit paginates after reading and filtering rows in JavaScript; Codex state
  runtime uses keyset pagination in SQLite.
- CodexKit's filter-count endpoint is an additional aggregation over
  `cwd`, `model_provider`, and `archived`; Codex's list API does not expose that
  aggregation shape directly.

These differences are implementation details, not compatibility promises. If
CodexKit continues to read `state_5.sqlite`, keep the reader defensive: tolerate
missing databases, schema changes, missing optional fields, and changes in
Codex's preferred list semantics.
