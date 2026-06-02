// Target classification — the remote-vs-local detection seam for the MCP App.
//
// The MCP process resolves a connection target into one of two modes (ADR-0006):
//   • remote — an `http(s)://` / `red://` URL (or a bare host:port). Handed to the
//     browser Surface as-is via the Open Contract (`?cs=`), no process spawned.
//   • local  — a filesystem path / `file://` / `*.rdb`. A browser cannot reach a
//     file, so this routes to the local handler seam that the local-file slice
//     (ADR-0006) builds on; today it returns a clear "not yet".
//
// No secret/token ever rides the connection string (ADR-0005): credentials in a
// user-supplied URL are stripped here, before the value can reach `?cs=`.

import { fileURLToPath } from "node:url";

export type TargetMode = "remote" | "local";

export interface RemoteTarget {
  mode: "remote";
  /**
   * Connection string to seed via the Open Contract `?cs=` param. Never carries
   * a secret — userinfo (`user:pass@`) is stripped during classification.
   */
  connectionString: string;
  /** The original, trimmed target as supplied by the caller. */
  raw: string;
}

export interface LocalTarget {
  mode: "local";
  /** Filesystem path resolved from the target (`file://` decoded if present). */
  path: string;
  /** The original, trimmed target as supplied by the caller. */
  raw: string;
}

export type ClassifiedTarget = RemoteTarget | LocalTarget;

const REMOTE_SCHEMES = new Set(["http:", "https:", "red:"]);

// A leading `scheme:` where the scheme is 2+ chars (a single char + `:` is a
// Windows drive letter, e.g. `C:\db.rdb`, not a URL scheme).
const SCHEME_RE = /^([a-zA-Z][a-zA-Z0-9+.-]+):/;

// A bare `host:port` with no scheme, e.g. `localhost:5055` or `10.0.0.2:5050`.
const HOST_PORT_RE = /^[a-zA-Z0-9.-]+:\d+$/;

/** Strip any embedded credentials and fragment from a URL we will expose. */
function sanitizeUrl(url: URL): string {
  url.username = "";
  url.password = "";
  url.hash = "";
  // `new URL` appends a trailing slash to the root path of special schemes
  // (http/https). Drop it so the connection string round-trips cleanly.
  return url.toString().replace(/\/$/, "");
}

/**
 * Classify a connection target as remote or local.
 *
 * @throws if the target is empty or carries an unsupported URL scheme.
 */
export function classifyTarget(rawInput: string): ClassifiedTarget {
  const raw = rawInput.trim();
  if (!raw) {
    throw new Error("Target is empty.");
  }

  // A bare `host:port` (no scheme) reads like a `scheme:` to the regex below
  // (`localhost:5055` → scheme "localhost"), so detect it first. It is reachable
  // only over HTTP from a browser, so normalize to an http URL for the contract.
  if (HOST_PORT_RE.test(raw)) {
    return { mode: "remote", connectionString: `http://${raw}`, raw };
  }

  const schemeMatch = SCHEME_RE.exec(raw);
  if (schemeMatch) {
    const scheme = `${schemeMatch[1].toLowerCase()}:`;

    if (REMOTE_SCHEMES.has(scheme)) {
      let url: URL;
      try {
        url = new URL(raw);
      } catch {
        throw new Error(`Malformed remote target URL: ${raw}`);
      }
      if (!url.host) {
        throw new Error(`Remote target is missing a host: ${raw}`);
      }
      return { mode: "remote", connectionString: sanitizeUrl(url), raw };
    }

    if (scheme === "file:") {
      let path: string;
      try {
        path = fileURLToPath(raw);
      } catch {
        throw new Error(`Malformed file:// target: ${raw}`);
      }
      return { mode: "local", path, raw };
    }

    throw new Error(
      `Unsupported target scheme "${scheme}". Use http(s)://, red://, file://, or a filesystem path.`
    );
  }

  // No scheme. A `.rdb` file or anything path-shaped is local; a bare host:port
  // is remote (the browser fetches it over HTTP).
  if (/\.rdb$/i.test(raw)) {
    return { mode: "local", path: raw, raw };
  }

  if (isPathShaped(raw)) {
    return { mode: "local", path: raw, raw };
  }

  // A bare token with no port, no path separators, and no `.rdb` is ambiguous.
  // Treat it as a local path — a stray hostname without a port can't be fetched
  // anyway, and the local handler can report a clear, actionable error.
  return { mode: "local", path: raw, raw };
}

/** Heuristic: does this look like a filesystem path rather than a hostname? */
function isPathShaped(raw: string): boolean {
  return (
    raw.startsWith("/") || // absolute POSIX
    raw.startsWith("./") ||
    raw.startsWith("../") ||
    raw.startsWith("~") || // home-relative
    raw.includes("/") || // any POSIX separator
    /^[a-zA-Z]:[\\/]/.test(raw) || // Windows drive, C:\ or C:/
    raw.includes("\\") // Windows separator
  );
}
