// Target mode detection for the MCP App (#47, ADR-0006).
//
// The MCP can be asked to open red-ui against two kinds of target:
//   - REMOTE: an http(s):// or red(s):// URL (or a bare host:port). The browser
//     Surface fetches it directly via the Open Contract (`?cs=`); nothing is
//     spawned.
//   - LOCAL: a filesystem path / `file://` / a `*.rdb` file. A browser cannot
//     reach a file, so this is routed to the local handler seam, which (per
//     ADR-0006, issue #48) spawns a local `red server` in front of the file.
//     Until #48 lands the seam returns a clear "not yet" message.
//
// This module is the pure classifier; the `open_red_ui` tool consults it.

export type TargetMode = "remote" | "local";

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:\/\//i;
const RDB_RE = /\.rdb($|[?#])/i;
const FS_PATH_RE = /^(\.\/|\.\.\/|\/|~\/?|[a-zA-Z]:[\\/])/;

/**
 * Classify a connection target. An empty/absent target is `remote` (a cold
 * open / Connect screen — there is nothing local to serve). `file://` and
 * filesystem paths (including a bare `*.rdb`) are `local`; every other URL
 * scheme — `http(s)://`, `red(s)://`, `grpc://` — and a bare `host:port` are
 * `remote`. `red://` is remote on purpose: it is browser-reachable as an
 * http(s) alias (ADR-0003), not a local file.
 */
export function classifyTarget(target: string | undefined | null): TargetMode {
  const t = (target ?? "").trim();
  if (!t) return "remote";
  if (/^file:\/\//i.test(t)) return "local";
  // Any explicit URL scheme (http/https/red/reds/grpc/…) is a server endpoint.
  if (SCHEME_RE.test(t)) return "remote";
  // No scheme: a .rdb file or a filesystem-looking path is a local file.
  if (RDB_RE.test(t) || FS_PATH_RE.test(t)) return "local";
  // Bare host:port (or hostname) — normalizeUrl prepends http:// → remote.
  return "remote";
}
