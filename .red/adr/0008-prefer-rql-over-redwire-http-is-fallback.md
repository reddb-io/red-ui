# ADR 0008 — Prefer RQL over RedWire; HTTP is bootstrap/fallback

Status: accepted
Date: 2026-07-07

## Decision

red-ui's preferred data path is **RQL statements over RedWire-over-binary-WebSocket**
(`/redwire`, subprotocol `reddb.redwire.v1`). The HTTP-JSON surface
(`RedClient`'s REST endpoints, `POST /query`, `POST /query/stream`) is demoted
to a **bootstrap/fallback** role: proof-of-life (`/stats`), capability
discovery, environments where binary WS is blocked, and operations RQL cannot
yet express.

This adopts reddb ADR-0049 ("UI canonical transport is RedWire-over-WebSocket",
accepted 2026-06-08) on the client side, and records the maintainer's product
direction: *always prefer RQL via redwire over HTTP requests*.

## Why

- **One transport reaches everything.** CDC, replication topology stats, and
  subscriptions are streaming-native; RedWire-over-WS carries them as one
  framed, multiplexed, backpressured protocol. The HTTP+SSE pair splits the
  contract in two.
- **Version negotiation is native.** The RedWire handshake's
  `SUPPORTED_VERSION` exchange is a hard negotiation; the HTTP surface
  advertises no protocol version at all. A mismatch renders a friendly
  "update" banner — the negotiation is hard, only the presentation is soft.
- **It works on every Surface.** Browser/PWA cannot open raw TCP (`red://`
  :5050) or gRPC; WebSocket is the one native conduit all three Surfaces
  (PWA, desktop webview, embed) share. This is why red-ui does not copy
  red-request's `red connect` gRPC-REPL model — that fits a Rust-owned
  sidecar, not a browser bundle.
- **The client half already exists.** The #94 spike implements the frame
  codec, handshake, and auth kinds; the server ships the endpoint
  (`reddb-wire/src/redwire`, served by `reddb-server`).

## Consequences

- The spike is hardened into a production transport module and slotted behind
  the existing seams (`RedClientOptions.fetch` is *not* abused for this; the
  query path `query()`/`queryStreamCollect()` switches transport internally,
  and `transports.ts` learns `ws`/`wss` as a real Surface capability per
  ADR-0003). Tracked in #141.
- The HTTP client is **not removed**. Connections to older reddb or through
  WS-blocking middleboxes keep working, badged honestly as fallback.
- Dev-console entries look the same on either transport (`kind: "query"`,
  duration, rows, sanitized statement), so the embed `consoleSink` contract
  is transport-agnostic.

## Related

- reddb ADR-0049, ADR-0036 (unified async connection model), ADR-0034
- red-ui ADR-0003 (transport reachability is a Surface capability)
- Issues #94 (spike), #95 (benchmark), #96 (decision gate — answered), #141
  (implementation)
