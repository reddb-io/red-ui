// Transport reachability (#34, ADR-0003). Which wire transports a connection
// can actually use is a property of the *Surface*, not the Core: a browser can
// only speak http(s) (and red:// coerced onto http — see normalizeUrl), while a
// Tauri Surface can additionally open native TCP/TLS and unix-socket / embedded
// files. The Connect UI offers only the transports the active provider declares
// reachable, so the user never picks an option that fails with a transport
// error. This module is the pure scheme↔transport mapping + reachability sets;
// the provider declares its set and the UI consults it.

import type { Transport } from './types'

/** User-typed connection-string scheme → wire transport. */
const SCHEME_TRANSPORT: Record<string, Transport> = {
  http: 'http',
  https: 'https',
  red: 'tcp',
  'red+tcp': 'tcp',
  'red+wire': 'tcp',
  reds: 'tls',
  'red+tls': 'tls',
  'red+unix': 'unix',
  file: 'unix',
  unix: 'unix',
  'red+http': 'http',
  'red+https': 'https',
}

/**
 * The transport a user-typed connection string would use. Defaults to `http`
 * for a bare `host:port` (matching normalizeUrl, which prepends http://).
 * Returns `null` for a scheme this client doesn't recognise at all.
 */
export function transportForUrl(input: string): Transport | null {
  const raw = input.trim()
  if (!raw) return null
  const m = raw.match(/^([a-z+]+):\/\//i)
  if (!m) return 'http' // bare host:port → http (normalizeUrl prepends it)
  return SCHEME_TRANSPORT[m[1].toLowerCase()] ?? null
}

/**
 * Browser-reachable transports. http/https are native; tcp/tls are reachable
 * because the UI coerces `red://`/`reds://` onto http(s) at :5055
 * (normalizeUrl — the documented `red://localhost` production tunnel). Only
 * unix-socket / embedded-file connections are genuinely unreachable from a
 * browser, so those are the ones the browser Surface hides.
 */
export const BROWSER_TRANSPORTS: readonly Transport[] = ['http', 'https', 'tcp', 'tls']

/** A Tauri Surface adds native unix-socket / embedded-file connections. */
export const DESKTOP_TRANSPORTS: readonly Transport[] = ['http', 'https', 'tcp', 'tls', 'unix']

/**
 * Whether a user-typed URL's transport is reachable from a provider that
 * declares `supported`. An unrecognised scheme is never reachable.
 */
export function isUrlReachable(input: string, supported: readonly Transport[]): boolean {
  const t = transportForUrl(input)
  return t !== null && supported.includes(t)
}
