# MCP App pre-configuration: target via URL params, secrets via postMessage

The local MCP server pre-configures the loaded MCP App by appending **non-secret** config (the reddb endpoint and the initial view) to the app URL; the Core reads these boot params through a `ConnectionProvider`. Any **secret** (a token) is delivered after load via `postMessage`, never in the URL.

## Status

accepted — the boot-param + managed-session-token channel is consumed by ADR-0006's
remote path (#27 handoff token).

## Context

The MCP App loads the hosted PWA (`RED_UI_APP_URL`, default `https://ui.reddb.io`) with a `connectDomains` allowlist. URL params are the simplest stateless way to seed the endpoint + view and need no new channel. Tokens are kept out of the URL because URLs leak into history, logs, and referrers.

## Consequences

- A pre-configured MCP connection is either unauthenticated/local, or its token arrives over `postMessage` — do not "simplify" by putting the token in a query param.
- The `ConnectionProvider` for the MCP App Surface reads boot params; this is the same seam the other Surfaces use (ADR-0001), so the Core does not special-case MCP.
