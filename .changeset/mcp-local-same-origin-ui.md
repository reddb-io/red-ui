---
"@reddb-io/ui-mcp": minor
"@reddb-io/ui": minor
---

MCP local-file mode now serves the Embeddable Lib bundle (#37) itself over
`http://127.0.0.1:<port>` and points the embedded iframe there instead of the
hosted HTTPS origin (ADR-0006, #51). The visual UI and the spawned `red server`
then share an `http://` scheme, so there is no HTTPS→`http://localhost`
mixed-content block (Chrome exempts localhost, but Firefox/Safari are
unreliable) and a local session works fully offline. The host page imports the
same-origin bundle and mounts red-ui through an `InjectedClientProvider` seeded
from the `?cs=` endpoint. One embed server per MCP process, torn down with the
local `red server` on disconnect/exit. The bundle directory is resolved from the
installed `@reddb-io/ui` (overridable via `RED_UI_EMBED_DIR`); the `red-ui mcp`
launcher passes it through. Remote mode is unchanged — it still loads the hosted
UI and spawns nothing. The app resource's CSP now also allows loopback origins
(`http://localhost:*`, `http://127.0.0.1:*`) for framing, scripts, and fetches.
