# Codex Assumption

This directory records Codex internal implementation assumptions used by
CodexKit development. These notes may cover private formats, reverse-engineered
behavior, and non-stable interfaces. They are references for implementation
decisions, not Codex public API contracts or long-term compatibility guarantees.

## Documents

- [codex-app-ipc-session-message.md](./codex-app-ipc-session-message.md): Codex
  App local IPC path for sending a message to an active session.
- [rollout-jsonl-format.md](./rollout-jsonl-format.md): Codex `rollout-*.jsonl`
  internal format.

## Writing Rules

Every document must include YAML front matter with:

- `date`: the date this assumption document was last updated.
- `description`: a one-sentence summary of the assumption.
- `reference`: structured evidence for the assumption.

Use this reference shape:

```yaml
---
date: "2026-07-07"
description: "Short summary"
reference:
  - type: "codex-repository"
    repository: "https://github.com/openai/codex"
    commit: "<commit-sha>"
    url: "https://github.com/openai/codex/tree/<commit-sha>"
  - type: "codex-desktop-reverse-engineering"
    platform: "macOS"
    app_version: "<version>"
    build: "<build-or-empty>"
    observed_at: "YYYY-MM-DD"
    notes: "Short observation scope"
  - type: "official-documentation"
    title: "Document title"
    url: "https://..."
---
```

Reference requirements:

- `codex-repository` requires `repository`, `commit`, and `url`.
- `codex-desktop-reverse-engineering` requires `platform`, `app_version`, and
  `observed_at`; `build` and `notes` are optional.
- `official-documentation` requires `title` and `url`.

When citing Codex source files, use permalinks pinned to a specific commit.
Avoid floating branch links. Separate facts confirmed from source code, facts
confirmed by official documentation, and observations from reverse engineering.
Describe internal formats defensively and keep readers aware that they may
change across Codex versions.
