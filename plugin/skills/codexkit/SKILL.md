---
name: codexkit
description: Open or inspect the local CodexKit dashboard for the current Codex session.
---

# CodexKit

Use CodexKit when a user wants to inspect Codex session metadata or view the local configuration dashboard.

Run:

```bash
npx -y @codexkit/runtime open
```

The runtime serves the dashboard at `http://127.0.0.1:43188` and exposes session/config examples through `/api/*`.
