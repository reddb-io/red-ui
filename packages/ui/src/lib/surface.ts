// Surface detection + the surface-aware boot gate.
//
// A "Surface" is one of the three runtime lenses the Core is delivered
// through (see .red/CONTEXT.md and ADR 0001). The boot gate needs to know
// which Surface it is running on so a credential-less Surface is never
// blocked by the master-password vault when there is no secret to protect.
//
//   embedded   — the Core is mounted inside a host page (Embeddable Lib),
//                or run headless (MCP server / SSR / tests). The host owns
//                auth; the Core holds no secret of its own.
//   standalone — the Desktop App: a Tauri webview standalone binary that
//                keeps an OS-keychain-backed credentials vault.
//   web        — a plain hosted browser PWA that protects saved
//                connection credentials with a per-session master password.

export type Surface = 'embedded' | 'standalone' | 'web'

export interface SurfaceEnv {
  /** A DOM window exists (browser tab or Tauri webview). */
  hasWindow: boolean
  /** Tauri webview globals are present. */
  isTauri: boolean
  /** The Core was mounted inside a host app (Embeddable Lib opt-in). */
  isEmbedded: boolean
}

/** Read the ambient environment. Kept separate so detection stays pure/testable. */
export function readSurfaceEnv(): SurfaceEnv {
  const hasWindow = typeof window !== 'undefined'
  return {
    hasWindow,
    isTauri:
      hasWindow && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window),
    isEmbedded:
      hasWindow && (window as unknown as { __RED_EMBEDDED__?: boolean }).__RED_EMBEDDED__ === true,
  }
}

/**
 * Classify the current Surface from an environment snapshot.
 *
 * Precedence: Tauri wins (it is also a "window"), then an explicit embed
 * opt-in or the headless/no-window case, otherwise a plain browser is `web`.
 */
export function detectSurface(env: SurfaceEnv = readSurfaceEnv()): Surface {
  if (env.isTauri) return 'standalone'
  if (env.isEmbedded || !env.hasWindow) return 'embedded'
  return 'web'
}

/**
 * Whether the master-password vault must gate boot for this Surface.
 *
 * - embedded: the host owns auth; the Core has no secret of its own → never.
 * - web: the hosted PWA only protects saved credentials. With nothing
 *        stored yet there is nothing to unlock → gate only when a secret
 *        already exists (`hasSecret`).
 * - standalone: the Desktop App keeps its keychain-backed vault → always
 *        (the keychain then satisfies the gate without a prompt).
 *
 * `hasSecret` is consulted only for `web`; the other Surfaces decide
 * structurally and ignore it.
 */
export function surfaceGatesBoot(surface: Surface, hasSecret: boolean): boolean {
  switch (surface) {
    case 'embedded':
      return false
    case 'web':
      return hasSecret
    case 'standalone':
      return true
  }
}
