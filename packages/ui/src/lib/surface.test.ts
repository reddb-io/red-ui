import { describe, expect, it } from 'vitest'
import { detectSurface, surfaceGatesBoot, type SurfaceEnv } from './surface'

const env = (over: Partial<SurfaceEnv>): SurfaceEnv => ({
  hasWindow: true,
  isTauri: false,
  isEmbedded: false,
  ...over,
})

describe('detectSurface', () => {
  it('classifies a Tauri webview as standalone (even though it is also a window)', () => {
    expect(detectSurface(env({ isTauri: true }))).toBe('standalone')
    // Tauri precedence holds even if an embed flag is somehow also set.
    expect(detectSurface(env({ isTauri: true, isEmbedded: true }))).toBe('standalone')
  })

  it('classifies a plain hosted browser as web', () => {
    expect(detectSurface(env({}))).toBe('web')
  })

  it('classifies an explicit host-mounted Core as embedded', () => {
    expect(detectSurface(env({ isEmbedded: true }))).toBe('embedded')
  })

  it('classifies the headless / no-window (local) case as embedded', () => {
    expect(detectSurface(env({ hasWindow: false }))).toBe('embedded')
  })
})

describe('surfaceGatesBoot', () => {
  it('never blocks the embedded Surface — the host owns auth', () => {
    expect(surfaceGatesBoot('embedded', false)).toBe(false)
    expect(surfaceGatesBoot('embedded', true)).toBe(false)
  })

  it('does not block the web Surface when there is no secret to protect', () => {
    expect(surfaceGatesBoot('web', false)).toBe(false)
  })

  it('blocks the web Surface once a secret exists', () => {
    expect(surfaceGatesBoot('web', true)).toBe(true)
  })

  it('always blocks the standalone Surface — it keeps its vault unlock', () => {
    expect(surfaceGatesBoot('standalone', false)).toBe(true)
    expect(surfaceGatesBoot('standalone', true)).toBe(true)
  })

  it('credential-less Surfaces are not blocked; standalone is', () => {
    const credentialless: Array<[Surface: 'embedded' | 'web', hasSecret: boolean]> = [
      ['embedded', false],
      ['web', false],
    ]
    for (const [surface, hasSecret] of credentialless) {
      expect(surfaceGatesBoot(surface, hasSecret)).toBe(false)
    }
    expect(surfaceGatesBoot('standalone', false)).toBe(true)
  })
})
