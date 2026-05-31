# red-ui

Universal client for reddb. A single **Core** rendered through three **Surfaces** that are the same product seen at different moments; the differences between Surfaces live in an injectable **Shell**, never in the Core.

## Language

**Core**:
The reusable reddb client application — components, connection logic, and renderers — that every Surface renders. Lives in `@reddb-io/ui`.
_Avoid_: app, frontend, UI (too vague)

**Surface**:
One of the three ways the Core is delivered. Exactly three exist: **Embeddable Lib**, **MCP App**, **Desktop App**. A Surface is a packaging/delivery lens, not a separate product.
_Avoid_: output, target, build (use as informal synonyms only)

**Embeddable Lib**:
The Surface where the Core is imported as a mountable component into a host JS/TS app — placed behind the host's own auth and extended by the host.

**MCP App**:
The Surface where the Core is served as an `@modelcontextprotocol/ext-apps` app resource, pre-configurable by the MCP host (e.g. a default connection).

**Desktop App**:
The Surface where the Core runs in a Tauri 2 webview as an installable cross-platform desktop binary. Lives in `@reddb-io/ui-desktop`.

**Mountable Root**:
The Core's top-level component (`Workspace`) that a host can mount without the Core owning routing or `window.history`.

**Shell**:
The per-Surface concerns injected around the Core — connection acquisition, auth ownership, transport, and extension points — so the Core stays identical across Surfaces.

**ConnectionProvider**:
The single contract through which a Shell supplies the Core with a connected reddb client; the Core asks the provider for a client and stays agnostic to how it was obtained (injected config, a host-built client, or the Core's own Connect flow).

**Embedded connection**:
A connection where reddb runs in-process against a local file (`file://`/`memory://`) rather than over the network. Reachable only where the runtime has filesystem access — natively in the Desktop App, via the MCP server for the MCP App, and not at all from a plain browser Surface today.

## Relationships

- One **Core** is rendered by all three **Surfaces**.
- The **Embeddable Lib** and **MCP App** Surfaces consume the Core via its **Mountable Root** (`lib/` entrypoint); the **Desktop App** and the hosted PWA consume the full SvelteKit app (`routes/`), which itself wraps the same `lib/` components.
- Each **Surface** supplies its own **Shell**; the **Shell** carries everything that differs between Surfaces.
- **Transport reachability is a property of the Surface, not the Core.** The Core is transport-agnostic; which transports a **ConnectionProvider** can materialize (http only, or also **Embedded connection**/`red://`) depends on the Surface's runtime.

## Flagged ambiguities

- "server" was used for two distinct things — resolved: an **application/backend server** (the Core needs none; the old `/_red` proxy was Vite-dev-only) vs a **static file host** (only delivers the bundle; the Desktop App eliminates even that).
