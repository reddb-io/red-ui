# One Core, three Surfaces, injectable Shell

red-ui is a single **Core** (`@reddb-io/ui`) delivered through three **Surfaces** — Embeddable Lib, MCP App, Desktop App — that are the same product at different moments, not separate apps. We chose this over three independent frontends so behaviour and renderers stay identical everywhere; the only per-Surface differences live in an injectable **Shell**.

## Considered Options

- **Core = router-agnostic mountable root only** — clean for embed/MCP, but forces the PWA/Tauri to rebuild app-level routing.
- **Core = full SvelteKit app, surfaces wrap it (iframe/element)** — simplest to ship, but the Embeddable Lib can't sit naturally behind a host's auth/extension without iframe friction.
- **Hybrid two-entrypoint (chosen)** — one package exposes a **Mountable Root** (`lib/` entrypoint, `Workspace`) for Embeddable Lib + MCP App, and the full SvelteKit app (`routes/`) for Desktop App and the hosted PWA, both built from the same `lib/` components.
- **Embeddable export packaging (settled for issue #37)** — ship the Shadow-DOM Embeddable Lib from the existing `@reddb-io/ui` package as `@reddb-io/ui/embed`. Do not introduce a separate `@reddb-io/ui-embed` package until there is independent release cadence, dependency, or ownership pressure.

## Consequences

- The Mountable Root (`Workspace`) must not own routing or `window.history`; internal navigation is component state (or a host-injected router), so embedding never fights the host.
- The Shell carries connection, auth, transport, and extension. Connection+auth flow through a single **ConnectionProvider** contract (see CONTEXT.md): the host injects a provider that yields an already-authenticated client (Embeddable Lib behind host auth), while PWA/Tauri plug `LocalUrlProvider` + secure-store. The Core never branches on which Surface it is.
- Extension happens through the renderers registry and the per-component `lib/` exports, not by forking the Core.
