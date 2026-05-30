// The Open Contract — the URL shape that lets one red-ui bundle be opened
// against a specific target from outside (the reddb.io "open" button, a
// `red://open?…` deep-link, a hand-built `ui.reddb.io/?cs=…` link).
//
// Three fields, three different transports, chosen for security:
//   - `cs`  (query)  the target server URL. ALWAYS a browser-reachable
//                    http(s) URL, NEVER a filesystem path — a hosted page
//                    cannot open a file, and `?cs=/etc/passwd`-style input
//                    is rejected rather than silently mishandled.
//   - `to`  (query)  the initial route to land on (e.g. `/c/users`). A
//                    same-origin path only, so it can never become an open
//                    redirect to another origin.
//   - `token` (#hash) the short-lived session-handoff token. Carried ONLY
//                    in the URL fragment so it never reaches a server log,
//                    a `Referer` header, or the query string. The fragment
//                    stays client-side; the caller consumes the token and
//                    must never persist it.
//
// This module is the single encode/parse seam shared by every producer and
// consumer of those links. It is pure (no DOM, no network) so it round-trips
// under test and runs the same in the browser, Tauri, and Node.

export interface OpenContract {
  /** Target server URL — a browser-reachable http(s) URL, never a file path. */
  cs?: string
  /** Short-lived handoff token. Lives only in the #hash; never persist it. */
  token?: string
  /** Initial route to land on, e.g. `/c/users`. Same-origin path only. */
  to?: string
}

/** The two URL pieces the contract is split across. */
export interface OpenContractUrlParts {
  /** Query string, including a leading `?` (empty when there is no query). */
  search: string
  /** Fragment, including a leading `#` (empty when there is no fragment). */
  hash: string
}

export interface OpenContractParse {
  contract: OpenContract
  /** Non-fatal issues: fields that were present but dropped, with the reason. */
  warnings: string[]
}

/** Anything we can pull a `search` + `hash` out of. */
export type OpenContractSource =
  | OpenContractUrlParts
  | URL
  | Location
  | string

/**
 * True when `value` is a URL the browser can actually fetch — an absolute
 * http: or https: URL. This is the gate that rejects filesystem paths
 * (`/var/db.rdb`, `./mydb.rdb`, `C:\db`), `file://` URLs, and any other
 * non-reachable scheme: they either fail to parse as an absolute URL or
 * carry a non-http(s) protocol.
 */
export function isBrowserReachableUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  return url.protocol === 'http:' || url.protocol === 'https:'
}

/**
 * True when `to` is a safe same-origin route: an absolute path beginning
 * with a single `/`. Rejects protocol-relative (`//evil.com`) and
 * backslash-smuggled (`/\evil.com`) forms that browsers can treat as a
 * cross-origin redirect.
 */
export function isSafeRoute(to: string): boolean {
  if (!to.startsWith('/')) return false
  // Second char `/` or `\` turns it into a protocol-relative / external URL.
  if (to.length >= 2 && (to[1] === '/' || to[1] === '\\')) return false
  return true
}

function stripLeading(s: string, ch: string): string {
  return s.startsWith(ch) ? s.slice(1) : s
}

function toParts(source: OpenContractSource): OpenContractUrlParts {
  if (typeof source === 'string') {
    // A full URL parses cleanly; otherwise treat the string as a raw
    // `search#hash` (or `?search#hash`) tail.
    try {
      const u = new URL(source)
      return { search: u.search, hash: u.hash }
    } catch {
      const hashIdx = source.indexOf('#')
      if (hashIdx >= 0) {
        return { search: source.slice(0, hashIdx), hash: source.slice(hashIdx) }
      }
      return { search: source, hash: '' }
    }
  }
  // URL, Location, or an OpenContractUrlParts literal all expose search/hash.
  return { search: source.search ?? '', hash: source.hash ?? '' }
}

/**
 * Parse an Open Contract out of a location's query + fragment.
 *
 * Tolerant by design: a malformed or disallowed field is dropped (never
 * throws) and the reason is recorded in `warnings`, so a bad link still
 * boots the app instead of crashing it. The two security invariants are
 * enforced here:
 *   - a `token` in the QUERY string is ignored (tokens travel only in #hash);
 *   - a `cs` that is not a browser-reachable http(s) URL is rejected.
 */
export function parseOpenContract(source: OpenContractSource): OpenContractParse {
  const { search, hash } = toParts(source)
  const warnings: string[] = []
  const query = new URLSearchParams(stripLeading(search, '?'))
  const fragment = new URLSearchParams(stripLeading(hash, '#'))
  const contract: OpenContract = {}

  const cs = query.get('cs')
  if (cs !== null) {
    if (isBrowserReachableUrl(cs)) {
      contract.cs = cs
    } else {
      warnings.push(`cs is not a browser-reachable http(s) URL; rejected: ${cs}`)
    }
  }

  const to = query.get('to')
  if (to !== null) {
    if (isSafeRoute(to)) {
      contract.to = to
    } else {
      warnings.push(`to must be a same-origin path beginning with '/'; rejected: ${to}`)
    }
  }

  // The token invariant: never honour it from the query string.
  if (query.has('token')) {
    warnings.push('token present in query string; ignored (tokens travel only in the #hash)')
  }
  const token = fragment.get('token')
  if (token) contract.token = token

  return { contract, warnings }
}

/**
 * Encode an Open Contract into URL parts. The inverse of {@link parseOpenContract}
 * for any valid contract.
 *
 * Unlike parsing, encoding is STRICT: a producer passing an invalid `cs` or
 * `to` is a programming error, so it throws rather than silently dropping the
 * field. The token is emitted ONLY into the fragment — it is structurally
 * impossible for `encodeOpenContract` to leak a token into the query string.
 */
export function encodeOpenContract(contract: OpenContract): OpenContractUrlParts {
  const query = new URLSearchParams()

  if (contract.cs != null) {
    if (!isBrowserReachableUrl(contract.cs)) {
      throw new Error(`cs must be a browser-reachable http(s) URL: ${contract.cs}`)
    }
    query.set('cs', contract.cs)
  }

  if (contract.to != null) {
    if (!isSafeRoute(contract.to)) {
      throw new Error(`to must be a same-origin path beginning with '/': ${contract.to}`)
    }
    query.set('to', contract.to)
  }

  const fragment = new URLSearchParams()
  if (contract.token) fragment.set('token', contract.token)

  const q = query.toString()
  const f = fragment.toString()
  return {
    search: q ? `?${q}` : '',
    hash: f ? `#${f}` : '',
  }
}
