---
"@reddb-io/ui-mcp": minor
---

MCP App now classifies its connection target. A URL-shaped target (`http(s)://`,
`red://`, or a bare `host:port`) is detected as a remote cluster and opens red-ui
connected to it via the Open Contract (`?cs=`), with no child process spawned. A
filesystem path / `file://` / `*.rdb` target is detected as local and routed to
the local handler seam (ADR-0006), which reports a clear "not yet" until the
local-file slice lands. Credentials in a remote URL are stripped before they can
reach the connection string, so no secret ever rides the URL (ADR-0005).
