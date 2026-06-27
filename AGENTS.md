# AGENTS.md

## Repository Defaults

- Use `vp` as the only project toolchain entrypoint.

## Architecture

CodexKit is a Codex plugin plus a local dashboard runtime.

```text
plugin hook -> codexkit CLI -> local Hono runtime -> React dashboard -> /api typed client -> core
```

## Directory Conventions

```text
.
├── apps/runtime/        # React + Hono dashboard runtime
│   ├── src/app/         # App providers, preferences, typed API client
│   ├── src/routes/      # TanStack Router routes
│   ├── src/server/      # Hono app, API routes, runtime entry
│   ├── src/server/core/ # CodexKit domain/data interface
│   └── src/ui/          # Shared UI primitives and utilities
├── packages/cli/        # codexkit CLI; starts/stops local runtime
└── plugin/              # Codex plugin manifest, hooks, and skill
```
