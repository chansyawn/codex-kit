export function createCodexSessionDeeplink(sessionId: string): string {
  return `codex://threads/${encodeURIComponent(sessionId)}`;
}
