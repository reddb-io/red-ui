// Transport reachability (#34, ADR-0003). Which transports a connection can use
// is bounded by what the *red-ui client* speaks — NOT by the browser, and NOT by
// what the reddb server exposes. reddb itself offers many wire transports (HTTP
// + SSE/NDJSON, RedWire on :5050, gRPC, Postgres-wire, and a WebSocket ingest
// endpoint `WS /ws/ingest/{collection}` — see ../reddb/docs/api/). The red-ui
// client, however, currently speaks only HTTP: RedClient is fetch-based (REST),
// and live changes use SSE/REST polling over the same http(s) connection. So the
// Connect UI offers http(s) only because that is the client's surface today — a
// `ws`/`wss` (or `grpc`) transport belongs here only once the client actually
// consumes reddb's WebSocket/gRPC endpoint, not before (that would be a phantom
// option that fails when picked).
//
// `red://`/`reds://` are not distinct client transports either: normalizeUrl
// rewrites them to `http(s)://host:5055` (the documented `red://localhost`
// production tunnel — red-ui's HTTP convention, distinct from reddb's native
// RedWire on :5050), so they classify as their coerced http(s) transport and are
// reachable wherever http(s) is. Streaming rides over the http(s) connection, so
// it needs no separate transport member. Only unix-socket / embedded-file
// connections are reachable solely from a Tauri Surface, so those are the ones a
// browser Surface hides. The Connect UI offers only the transports the active
// provider declares reachable, so the user never picks one that fails. This
// module is the pure scheme↔transport mapping + reachability sets; the provider
// declares its set and the UI consults it.

import type { Transport } from "./types";

/**
 * User-typed connection-string scheme → the wire transport it resolves to.
 * `red`/`reds` (and their `red+tcp`/`red+wire`/`red+tls` aliases) are sugar for
 * `http(s)://host:5055` via normalizeUrl, so they map to `http`/`https` — they
 * carry no distinct wire transport in any Surface today. Native tcp/tls remains
 * a possible future Desktop capability (ADR-0003) but is not materialized yet.
 */
const SCHEME_TRANSPORT: Record<string, Transport> = {
  http: "http",
  https: "https",
  red: "http",
  "red+tcp": "http",
  "red+wire": "http",
  reds: "https",
  "red+tls": "https",
  "red+http": "http",
  "red+https": "https",
  "red+unix": "unix",
  file: "unix",
  unix: "unix",
};

/**
 * The transport a user-typed connection string would use. Defaults to `http`
 * for a bare `host:port` (matching normalizeUrl, which prepends http://).
 * Returns `null` for a scheme this client doesn't recognise at all.
 */
export function transportForUrl(input: string): Transport | null {
  const raw = input.trim();
  if (!raw) return null;
  const m = raw.match(/^([a-z+]+):\/\//i);
  if (!m) return "http"; // bare host:port → http (normalizeUrl prepends it)
  return SCHEME_TRANSPORT[m[1].toLowerCase()] ?? null;
}

/**
 * Browser-reachable transports: `http`/`https` only (ADR-0003). `red://`/`reds://`
 * are still reachable here because they coerce to `http(s)://host:5055` and so
 * classify as `http`/`https` — the documented `red://localhost` production
 * tunnel keeps working — but the browser advertises no distinct red(s):// or
 * file:// transport. Unix-socket / embedded-file connections are genuinely
 * unreachable from a browser and are hidden.
 */
export const BROWSER_TRANSPORTS: readonly Transport[] = ["http", "https"];

/** A Tauri Surface adds the native unix-socket / embedded-file transport. */
export const DESKTOP_TRANSPORTS: readonly Transport[] = [
  "http",
  "https",
  "unix",
];

/**
 * Whether a user-typed URL's transport is reachable from a provider that
 * declares `supported`. An unrecognised scheme is never reachable.
 */
export function isUrlReachable(
  input: string,
  supported: readonly Transport[]
): boolean {
  const t = transportForUrl(input);
  return t !== null && supported.includes(t);
}
