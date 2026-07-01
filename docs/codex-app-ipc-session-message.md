# Codex App IPC Session Message Path

This document records a verified internal Codex App IPC send path, for later implementation of the ability to "send a message to the current Codex App session" in CodexKit.

## Conclusion

To make the currently open Codex App session immediately observe a new message, it is not enough to only write the session file, and it is also not enough to start an independent `codex app-server --stdio`. The verified working path is to connect to the Codex App local IPC router:

```text
$TMPDIR/codex-ipc/ipc-<uid>.sock
```

On the current machine, an example is:

```text
/var/folders/b6/3tvm6s897z94_f2m6955xbfm0000gn/T/codex-ipc/ipc-501.sock
```

This socket is not HTTP, WebSocket, JSONL, or app-server JSON-RPC. It uses a 4-byte little-endian length prefix followed by a UTF-8 JSON payload:

```text
uint32_le(payload_bytes)
json_payload
```

## Verified Flow

First, register an IPC client:

```json
{
  "type": "request",
  "requestId": "<uuid>",
  "method": "initialize",
  "params": {
    "clientType": "codexkit"
  }
}
```

A successful response returns the current client id:

```json
{
  "type": "response",
  "requestId": "<same uuid>",
  "resultType": "success",
  "method": "initialize",
  "result": {
    "clientId": "<client id>"
  }
}
```

You can first use a read-only request to verify whether the current Codex App webview owns the session:

```json
{
  "type": "request",
  "requestId": "<uuid>",
  "sourceClientId": "<client id>",
  "version": 1,
  "method": "thread-follower-load-complete-history",
  "params": {
    "conversationId": "<session id>"
  },
  "timeoutMs": 30000
}
```

After confirming success, use `thread-follower-start-turn` to create an actual user message:

```json
{
  "type": "request",
  "requestId": "<uuid>",
  "sourceClientId": "<client id>",
  "version": 1,
  "method": "thread-follower-start-turn",
  "params": {
    "conversationId": "<session id>",
    "turnStartParams": {
      "input": [
        {
          "type": "text",
          "text": "你好",
          "text_elements": []
        }
      ],
      "serviceTier": null
    }
  },
  "timeoutMs": 300000
}
```

In testing, this request is handled by the Codex Desktop client with `clientType: "desktop"`. On success, it returns a new turn and receives a `thread-stream-state-changed` broadcast for the current session. This broadcast indicates that the Codex App live stream controller has observed the state change.

## Discovery Requests

During the connection, the router may send a `client-discovery-request` to the CodexKit client, asking whether it can handle methods such as `ide-context`. CodexKit should not take over these requests. The recommended uniform response is:

```json
{
  "type": "client-discovery-response",
  "requestId": "<discovery request id>",
  "response": {
    "canHandle": false
  }
}
```

Otherwise, requests from other clients may wait until they time out.

## Notes

- This is a private Codex App IPC protocol, not a stable public API. Methods, versions, and parameter structures may all change with App versions.
- `thread-follower-start-turn` is only handled by the Codex App webview that currently owns the conversation. If there is no owner, it may return `no-client-found`, time out, or receive discovery false.
- The currently verified `version` value is `1`; the current `thread-stream-state-changed` broadcast version is `8`.
- When implementing the CodexKit runtime transport later, this path should be marked as an experimental capability and provide clear failure messages.
