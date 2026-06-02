// Connection resolution for the MCP data tools (#49, ADR-0006).
//
// A data tool receives an optional `connectionUrl`; combined with the configured
// default it resolves to a concrete reddb endpoint the server-side RedClient can
// reach. Two modes (ADR-0006, mirrors `open_red_ui`):
//   - REMOTE: an http(s):// or red(s):// URL. red:// is an http(s) alias
//     (ADR-0003); we normalise it to http(s) so `fetch` can reach it.
//   - LOCAL: a filesystem path / file:// / *.rdb. Per ADR-0006 the MCP must spawn
//     a local `red server` in front of the file and talk to it over
//     http://localhost — but that spawn is issue #48 and not implemented yet, so
//     resolving a local target throws a clear "not yet" error. This is the seam
//     #48 plugs into: it will return the spawned server's baseUrl here.
//
// The resolved auth header (if any) is carried in `headers` and never surfaces in
// tool output or logs — secrets never ride the URL (ADR-0005).

import { classifyTarget, type TargetMode } from "./target-mode.js";

export interface ResolvedConnection {
  /** http(s) base URL the RedClient fetches. Non-secret (ADR-0005). */
  baseUrl: string;
  /** Auth headers for the client. Never logged, never returned to the model. */
  headers?: Record<string, string>;
  mode: TargetMode;
}

/** Translate a `red(s)://` alias to its http(s) equivalent; pass other schemes
 *  through. red:// → http://, reds:// → https:// (ADR-0003). */
function normalizeRemoteUrl(target: string): string {
  const t = target.trim();
  const lower = t.toLowerCase();
  let url: URL;
  if (lower.startsWith("red://")) {
    url = new URL("http://" + t.slice("red://".length));
  } else if (lower.startsWith("reds://")) {
    url = new URL("https://" + t.slice("reds://".length));
  } else if (/^https?:\/\//i.test(t)) {
    url = new URL(t);
  } else {
    // Bare host:port / hostname — default to http (matches the UI's normalizer).
    url = new URL("http://" + t);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported connection scheme: ${target}`);
  }
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

export interface ResolveConnectionOptions {
  /** Default target when the tool call omits `connectionUrl`. */
  defaultUrl?: string;
  /** Auth header value applied to remote requests (never logged/returned). */
  authHeader?: string;
}

/**
 * Resolve a tool-supplied (or configured) target into a reachable endpoint.
 * Throws for a local-file target (#48 unimplemented) and for an absent target
 * with no configured default — the data tools need a concrete server to read.
 */
export function resolveConnection(
  target: string | undefined,
  opts: ResolveConnectionOptions = {}
): ResolvedConnection {
  const raw = (target ?? "").trim() || (opts.defaultUrl ?? "").trim();
  if (!raw) {
    throw new Error(
      "No reddb connection: pass a connectionUrl (http(s):// or red://), or set RED_UI_CONNECTION_URL on the MCP server."
    );
  }

  const mode = classifyTarget(raw);
  if (mode === "local") {
    throw new Error(
      `Cannot run data tools against the local file "${raw}" yet: local-file mode (a local red server in front of the file, ADR-0006 / #48) is not implemented. Point at an http(s):// or red:// server.`
    );
  }

  const headers = opts.authHeader
    ? { Authorization: opts.authHeader }
    : undefined;
  return { baseUrl: normalizeRemoteUrl(raw), headers, mode };
}
