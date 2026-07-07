---
date: "2026-07-07"
description: "Codex rollout JSONL internal format"
reference:
  - type: "codex-repository"
    repository: "https://github.com/openai/codex"
    commit: "cca16a10878202cb2f6e9666b6b4330329ea7e65"
    url: "https://github.com/openai/codex/tree/cca16a10878202cb2f6e9666b6b4330329ea7e65"
---

# Codex Rollout JSONL Format

This document records an internal implementation assumption about Codex
`rollout-*.jsonl` files. It is based on the linked Codex source snapshot and
should not be treated as a stable public API contract.

## File Location

Codex session rollouts are stored as JSONL files under the Codex home sessions
directory:

```text
$CODEX_HOME/sessions/YYYY/MM/DD/rollout-YYYY-MM-DDThh-mm-ss-<thread-id>.jsonl
```

The filename and dated directory layout are created by the rollout recorder. The
recorder formats the local start time into the path and embeds the thread id in
the filename. See `precompute_log_file_info` in
[`recorder.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/rollout/src/recorder.rs).

## Line Envelope

Each non-empty line is one JSON object. The common envelope is `RolloutLine`:

```json
{
  "timestamp": "2026-07-07T07:47:48.123Z",
  "type": "session_meta",
  "payload": {}
}
```

`timestamp` is written when the line is appended. `type` and `payload` come from
the flattened `RolloutItem` enum. The writer serializes one rollout item per
line and appends a newline. See `RolloutLine`, `RolloutItem`, `RolloutLineRef`,
and `JsonlWriter` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs)
and
[`recorder.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/rollout/src/recorder.rs).

## Top-Level Types

The current `RolloutItem` variants serialize to these top-level `type` values:

- `session_meta`
- `response_item`
- `inter_agent_communication`
- `inter_agent_communication_metadata`
- `compacted`
- `turn_context`
- `world_state`
- `event_msg`

These values are defined by `RolloutItem` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

## Key Payloads

`session_meta` stores session-level metadata that is not tied to one turn. It
includes session/thread identity, fork and parent thread ids, timestamp, working
directory, originator, CLI version, source, optional thread source, optional
agent nickname/role/path, model provider, base instructions, dynamic tools,
selected capability roots, memory mode, history mode, multi-agent version, and
initial context-window identity. The line may also include Git metadata through
`SessionMetaLine`. See `SessionMeta` and `SessionMetaLine` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

`turn_context` stores the durable runtime context needed to resume or fork a
thread. It includes the turn id, cwd, workspace roots, current date, timezone,
approval policy, sandbox policy, permission profile, network permissions,
filesystem sandbox policy, model, context hash, personality, collaboration mode,
multi-agent settings, realtime state, reasoning effort, and compatibility
summary field. See `TurnContextItem` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

`response_item` stores model-visible conversation items using the internal
`ResponseItem` enum. Current variants include messages, agent messages,
reasoning, local shell calls, function/custom tool calls, tool outputs, tool
search calls and outputs, web search calls, image generation calls, compaction
items, and context compaction items. Message content uses `ContentItem`, which
currently covers input text, input images, and output text. See `ResponseItem`
and `ContentItem` in
[`models.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/models.rs).

`event_msg` stores runtime and UI-facing events from the agent. The `EventMsg`
enum covers turn lifecycle events, user and agent messages, token counts,
reasoning updates, MCP startup and tool calls, web search, image generation,
command execution, approval requests, patch application, plan updates, review
mode, item lifecycle events, hooks, streaming deltas, and collaboration/subagent
events. See `EventMsg` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

`compacted` records a context compaction checkpoint. It includes the summary
message, optional replacement history, and optional context-window identifiers:
`window_number`, `first_window_id`, `previous_window_id`, and `window_id`. See
`CompactedItem` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

`world_state` stores persisted comparison state for resuming model-visible
world-state diffing. It records whether the state is a full baseline or a patch,
plus the JSON state payload. See `WorldStateItem` in
[`protocol.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/protocol/src/protocol.rs).

## Reading And Tolerance

Codex reads rollout files line by line and parses each non-empty line as a
`RolloutLine`. The first parsed `session_meta` is used as the canonical thread
id for the rollout. Later `session_meta` entries can appear when history is
copied from a fork source, so consumers should not assume every `session_meta`
line identifies the current rollout.

The loader counts JSON or rollout-line parse errors and continues reading later
lines. Empty session files are treated as an error. Legacy rollout shapes may be
recognized and skipped during loading. See `load_rollout_items` in
[`recorder.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/rollout/src/recorder.rs).

## Recommended Consumption

External tools should prefer the stable higher-level surfaces when possible:

- Use `state_5.sqlite` thread metadata for lists, filters, recency, cwd, model,
  provider, token totals, archive state, and rollout paths.
- Use App Server `Thread`, `Turn`, and `ThreadItem` when full conversation
  display data is needed.

The App Server projection converts raw rollout history into typed display items
such as `userMessage`, `agentMessage`, `reasoning`, `commandExecution`,
`fileChange`, `mcpToolCall`, `dynamicToolCall`, `collabAgentToolCall`,
`subAgentActivity`, `webSearch`, `imageView`, `sleep`, `imageGeneration`, and
`contextCompaction`. See `Thread` and `Turn` in
[`thread_data.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs)
and `ThreadItem` in
[`item.rs`](https://github.com/openai/codex/blob/cca16a10878202cb2f6e9666b6b4330329ea7e65/codex-rs/app-server-protocol/src/protocol/v2/item.rs).

When direct rollout parsing is necessary, treat the JSONL format as an internal
append-only log. Preserve unknown fields, tolerate unknown `type` values, and
avoid assuming that every payload variant is present in every Codex version.
