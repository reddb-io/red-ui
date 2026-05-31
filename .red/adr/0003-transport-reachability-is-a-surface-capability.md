# Transport reachability is a Surface capability, not a Core guarantee

The Core stays transport-agnostic (it asks a `ConnectionProvider` for a client), but the **set of transports actually reachable** is bounded by each Surface's runtime, because the browser sandbox exposes no filesystem or raw socket. So "connect to anything, including an embedded file" is true per-Surface, not universally.

## Decision

- **Desktop App** (Tauri): full transport set including **Embedded connection** (`file://`/`memory://`) and `red://`, served by the Rust side / embedded engine.
- **MCP App**: the local MCP server materializes a file as an embedded reddb behind local HTTP and hands the App a URL.
- **Browser Surfaces** (PWA, Embeddable Lib): **`http(s)://` only** for now. Opening a file is **not** supported in-browser — the user points at a reddb that is already served over HTTP (including a local one they ran).
- **North star (not current scope):** reddb compiled to **WASM** running in the browser, reading a file via the File System Access API, would make in-browser embedded connections literal and serverless. Pursue only if/when reddb ships a WASM build.

## Consequences

- The `ConnectionProvider` contract should let a Surface declare which transports it offers, so the Core's Connect UI can hide unreachable options instead of letting the client reject them (`BROWSER_TRANSPORT_UNSUPPORTED`).
- This is a deliberate **no**: browser Surfaces will not open local files until the WASM path exists — recorded so it isn't "fixed" as if it were an oversight.
