---
"@reddb-io/ui-mcp": minor
---

MCP App gains server-side data tools (`query`, `list`, `get`) that run a
server-side `RedClient` in the MCP process against the resolved connection and
return reddb reads to the model as `structuredContent` — the model reads data
directly without driving the visual iframe (ADR-0006, #49). `query` is read-only
(default-deny allowlist: SELECT/WITH/SHOW/EXPLAIN/DESCRIBE/MATCH; write/DDL is
refused); `list` returns collection names or a collection's rows; `get` fetches a
single record by id. Each tool resolves a remote endpoint per call (the tool's
`connectionUrl`, else `RED_UI_CONNECTION_URL`); local-file targets are refused
until the local-spawn slice (#48) lands. Auth comes from
`RED_UI_CONNECTION_TOKEN`/`RED_UI_CONNECTION_AUTH` and is sent only as a request
header — never logged, never returned in tool output (ADR-0005).
