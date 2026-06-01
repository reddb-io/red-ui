// Boot-params pre-configuration (#36, ADR-0005). A Surface (the MCP App) can
// seed the loaded Core with NON-SECRET connection config — the reddb endpoint
// and the initial view — by appending it to the app URL. The Core reads these
// through its ConnectionProvider's boot-params path (not a special MCP branch)
// and connects without the Connect flow.
//
// SECURITY: tokens/secrets are deliberately OUT OF SCOPE here and must NEVER
// travel in the URL (they leak into history, logs, referrers). They are
// reserved for a later postMessage channel (ADR-0005). parseBootParams drops
// any secret-looking param so a token in the URL can never reach the Core.

/** Non-secret connection config a Surface may seed via the app URL. */
export interface BootParams {
  /** reddb endpoint to connect to (e.g. `http://host:5055` or `red://host`). */
  endpoint?: string
  /** Initial top-level view: `query` | `collections` | `cluster` | `security`. */
  view?: string
}

// Query keys that carry the endpoint (mirrors the legacy ?connection= reading).
const ENDPOINT_KEYS = ['endpoint', 'connection', 'red_url', 'red']
const VIEW_KEY = 'view'

// Anything matching these is a secret and is refused outright (#36): a token in
// the URL is dropped, never surfaced as a boot param.
const SECRET_KEY = /(token|secret|password|passwd|auth|credential|api[-_]?key|bearer)/i

/**
 * Parse boot params from a URL query string (e.g. `location.search`). Returns
 * only the non-secret endpoint + view; secret-looking params are ignored so a
 * token placed in the URL can never reach the Core.
 */
export function parseBootParams(search: string): BootParams {
  const params = new URLSearchParams(search ?? '')
  const out: BootParams = {}

  for (const key of ENDPOINT_KEYS) {
    const v = params.get(key)
    if (v && !SECRET_KEY.test(key)) {
      out.endpoint = v
      break
    }
  }

  const view = params.get(VIEW_KEY)
  if (view) out.view = view

  return out
}

/** True iff the boot params carry an endpoint to auto-connect to. */
export function hasBootEndpoint(b: BootParams): boolean {
  return typeof b.endpoint === 'string' && b.endpoint.trim().length > 0
}
