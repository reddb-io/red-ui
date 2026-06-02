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
- **`red://` is not a distinct browser transport.** `normalizeUrl` rewrites `red://host` → `http://host:5055` and `reds://host` → `https://host:5055` (the documented `red://localhost` production tunnel), so a typed `red(s)://` URL classifies as its coerced `http(s)` transport. The browser therefore reaches it (the tunnel keeps working) but advertises only `http(s)://` per the decision above — `red(s)://` is accepted-as-alias, not offered-as-transport. Native tcp/tls over the wire would be a future Desktop capability and is **not materialized today**; the only Surface-specific transport currently is the Desktop `unix` socket / embedded file.

---

## Transport reference matrix (verified against `../reddb` docs + source, 2026-06-01)

reddb exposes **many** wire transports; the red-ui _client_ deliberately speaks a
subset, bounded by what each Surface's runtime can reach **and** by what the
client implements. The Connect UI never offers a transport the active client
cannot materialize. Sources: `../reddb/docs/api/{http,grpc,postgres-wire,ingest,query-streaming,embedded,mcp}.md`, `../reddb/docs/clients/drivers/rust.md`, `../reddb/crates/reddb-server/src/server/routing.rs`.

### What reddb actually offers

| Transport                     | Scheme / endpoint                                     | Default port               | Wire                                      | Browser-reachable?                                           | Best for                                                                                        |
| ----------------------------- | ----------------------------------------------------- | -------------------------- | ----------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **HTTP REST**                 | `http(s)://` `POST /query`, `GET /changes`, …         | 8080 (red-ui tunnel: 5055) | HTTP/1.1+2, JSON                          | ✅ `fetch`                                                   | Human-driven UI, the **most feature-complete** surface                                          |
| **HTTP NDJSON select-stream** | `POST /query/stream` → `application/x-ndjson`         | (HTTP)                     | chunked, bounded-memory, resumable cursor | ✅ `fetch` + `ReadableStream` (POST → **not** `EventSource`) | Large `SELECT` scans without buffering the whole result                                         |
| **HTTP SSE (ASK STREAM)**     | `POST /query` w/ `ASK … STREAM` → `text/event-stream` | (HTTP)                     | server→client tokens                      | ✅ `fetch`+`getReader` (POST → **not** `EventSource`)        | Progressive LLM answer tokens                                                                   |
| **WebSocket ingest**          | `WS /ws/ingest/{collection}`                          | (HTTP)                     | full-duplex, per-batch ack, backpressure  | ✅ native `WebSocket`                                        | Browser/agent **write** streaming                                                               |
| **CDC poll**                  | `GET /changes?since_lsn=`                             | (HTTP)                     | poll only — **no `/changes/stream`**      | ✅ `fetch`                                                   | Live-changes feed (the only CDC transport that exists)                                          |
| **RedWire**                   | `red(s)://`                                           | **5050**                   | raw TCP, CBOR, multiplexed, ~30µs         | ❌ raw TCP — impossible in a browser                         | Latency-sensitive native/back-end clients                                                       |
| **gRPC**                      | `grpc(s)://`                                          | 5055                       | HTTP/2 + protobuf                         | ❌ needs gRPC-web proxy (undocumented)                       | Back-end bulk ETL, replication. **Partial query surface** (MATCH/GRAPH/HLL/timeseries/ASK gaps) |
| **Postgres-wire**             | —                                                     | 5432 (conventional)        | PG v3, raw TCP                            | ❌ raw TCP                                                   | `psql`/pgAdmin/JDBC compatibility                                                               |
| **Embedded / stdio / MCP**    | in-process / `red mcp`                                | —                          | Rust in-process                           | ❌ (no `red ui <file>` command exists yet)                   | Desktop/CLI/agent, zero network hop                                                             |

Key facts that correct earlier assumptions:

- `red://` is **RedWire TCP on :5050** natively (`rust.md`), _not_ HTTP. red-ui coercing it to `http://:5055` is a **client convention** for its prod tunnel — and :5055 is reddb's _gRPC_ default, so this only works because the tunnel maps :5055→HTTP. Fragile if ports ever change.
- There is **no `/changes/stream` SSE endpoint** (`routing.rs` only has `GET /changes`). CDC is poll-only. The client's dormant SSE plumbing targets an endpoint reddb has not shipped.
- Both HTTP streaming reads are **POST-based**, so the browser `EventSource` API cannot drive them — `fetch` + `ReadableStream` is required.

### Optimal protocol per Surface (channel), with limitations

| Surface                                  | Reachable                           | Optimal today                              | Limitation                                                                                         | Available upgrade (not yet built)                                                                     |
| ---------------------------------------- | ----------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Web / PWA** (browser)                  | HTTP only                           | `POST /query` (REST) + `GET /changes` poll | No raw TCP/gRPC/PG-wire; no CDC push exists                                                        | NDJSON `POST /query/stream` for big results; `fetch`-SSE for `ASK STREAM`; `WS /ws/ingest` for writes |
| **Embeddable Lib** (browser, shadow DOM) | HTTP only (host-injected client)    | same as PWA                                | same; cannot elevate (`__TAURI__` absent)                                                          | same as PWA                                                                                           |
| **Tauri Desktop**                        | HTTP **+ native TCP/unix via Rust** | HTTP through the webview (same as browser) | **Not using its native advantage** — could speak RedWire(:5050)/gRPC from Rust for ~30µs vs ~250µs | Rust-side RedWire/gRPC client + IPC bridge; wire the dead `tcp_ping`; honour `red+unix`               |
| **MCP App**                              | HTTP (iframe)                       | display-proxy iframe → PWA                 | No model-callable data tools; all access is visual                                                 | Server-side `RedClient` data tools (query/list) returning structured content                          |

### Current red-ui state vs optimal

- **Web / Embed:** already optimal **given the channel** — HTTP is both the only reachable transport and reddb's most complete surface; CDC poll is the only live-changes path. ✅
- **Desktop:** sub-optimal but functional — runs the browser HTTP path inside the webview and ignores the Rust shell's native-socket capability. The `unix` transport is _advertised_ (`DESKTOP_TRANSPORTS`) but **not implemented end-to-end**, and `red+unix` deep links are registered but unhandled by `normalizeUrl`. Tracked as a gap, not silently shipped.
- **MCP:** functional as a launcher; no native data path (by design today).
