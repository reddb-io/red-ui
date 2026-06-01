// Surface detection + boot gate (#21, ADR-0001). red-ui is one Core delivered
// by three Surfaces; the boot gate must be Surface-aware so a credential-less
// Surface is never blocked behind the master-password vault.
//
//   - embedded   — the Embeddable Lib / MCP App, running inside a host that
//                  owns auth (or a local, no-secret connection). Credential-less:
//                  boots straight to data, no vault.
//   - standalone — the Tauri desktop app. Keeps its vault (the OS keychain,
//                  which unlocks automatically — "vault unlock as before").
//   - web        — the hosted PWA. Gates on the master password ONLY when there
//                  is a secret to protect (saved encrypted credentials); a fresh
//                  web user with nothing to decrypt boots straight to data.

export type Surface = 'embedded' | 'standalone' | 'web'

/** Runtime signals the Surface is derived from (pure — injectable for tests). */
export interface SurfaceSignals {
  /** Running inside the Tauri shell. */
  tauri: boolean
  /** Rendered inside a cross-document frame (embedded in a host page). */
  inFrame: boolean
  /** The MCP App boot flag (`?mcp=1`) is present. */
  mcp: boolean
}

/** Pure Surface decision from runtime signals. */
export function surfaceFrom({ tauri, inFrame, mcp }: SurfaceSignals): Surface {
  if (tauri) return 'standalone'
  if (inFrame || mcp) return 'embedded'
  return 'web'
}

/** Detect the Surface from the live browser globals. Defaults to `web` in SSR. */
export function detectSurface(): Surface {
  if (typeof window === 'undefined') return 'web'
  const tauri = '__TAURI_INTERNALS__' in window || '__TAURI__' in window
  let inFrame = false
  try {
    inFrame = window.self !== window.top
  } catch {
    // Cross-origin parent access throws — that itself means we're framed.
    inFrame = true
  }
  const mcp =
    typeof location !== 'undefined' && new URLSearchParams(location.search).has('mcp')
  return surfaceFrom({ tauri, inFrame, mcp })
}

/**
 * The initial lock state for a Surface (#21). `hasSecret` is whether encrypted
 * credentials already exist for the web vault.
 *
 * - embedded → never locked (credential-less; the host owns auth).
 * - standalone → locked initially; the Tauri keychain unlocks it (as before).
 * - web → locked only when there is a secret to decrypt; otherwise boots to data.
 */
export function bootGateLocked(surface: Surface, hasSecret: boolean): boolean {
  switch (surface) {
    case 'embedded':
      return false
    case 'standalone':
      return true
    case 'web':
      return hasSecret
  }
}
