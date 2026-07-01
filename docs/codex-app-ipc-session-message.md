# Codex App IPC Session Message Path

本文记录一次已验证的 Codex App 内部 IPC 发送路径，用于后续在 CodexKit 中实现“向当前 Codex App session 发送消息”的能力。

## 结论

要让当前打开的 Codex App 会话立刻感知新消息，不能只写 session 文件，也不能只启动独立的 `codex app-server --stdio`。已验证可行的路径是连接 Codex App 的本地 IPC router：

```text
$TMPDIR/codex-ipc/ipc-<uid>.sock
```

在当前机器上示例为：

```text
/var/folders/b6/3tvm6s897z94_f2m6955xbfm0000gn/T/codex-ipc/ipc-501.sock
```

该 socket 不是 HTTP、WebSocket、JSONL，也不是 app-server JSON-RPC。它使用 4 字节 little-endian 长度前缀加 UTF-8 JSON payload：

```text
uint32_le(payload_bytes)
json_payload
```

## 已验证流程

先注册一个 IPC client：

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

成功响应会返回当前 client id：

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

可以先用只读请求验证当前 Codex App webview 是否拥有该 session：

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

确认成功后，用 `thread-follower-start-turn` 创建真实用户消息：

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

实测该请求会由 Codex Desktop 的 `clientType: "desktop"` client 处理，成功后返回新 turn，并收到当前 session 的 `thread-stream-state-changed` broadcast。该 broadcast 表明 Codex App 的 live stream controller 已感知状态变化。

## Discovery 请求

连接期间，router 可能向 CodexKit client 发送 `client-discovery-request`，询问是否能处理例如 `ide-context` 之类的方法。CodexKit 不应接管这些请求，建议统一回复：

```json
{
  "type": "client-discovery-response",
  "requestId": "<discovery request id>",
  "response": {
    "canHandle": false
  }
}
```

否则其他客户端的请求可能等待到超时。

## 注意事项

- 这是 Codex App 私有 IPC 协议，不是稳定公开 API；method、version、参数结构都可能随 App 版本变化。
- `thread-follower-start-turn` 只会被当前拥有该 conversation 的 Codex App webview 处理。如果没有 owner，可能返回 `no-client-found`、超时或 discovery false。
- `version` 当前验证值为 `1`；`thread-stream-state-changed` broadcast 当前版本为 `8`。
- 后续实现 CodexKit runtime transport 时，应把该路径标为实验能力，并提供清晰失败信息。
