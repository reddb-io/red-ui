// CapabilityRenderer registry — deep module behind a tiny surface.
//
// Each renderer declares which capability it handles. pick() takes a
// capability hint (from the query result, slice metadata, or an override)
// and picks the right renderer; if no renderer matches the hint, it falls
// back to the renderer that `renders(result)` accepts, and finally to the
// 'table' renderer which is the universal default.

import type { QueryResult } from '#reddb'
import type { Capability, CapabilityRenderer } from './types'

export class RendererRegistry {
  private renderers: CapabilityRenderer[] = []

  register(renderer: CapabilityRenderer): void {
    const idx = this.renderers.findIndex((r) => r.capability === renderer.capability)
    if (idx >= 0) this.renderers[idx] = renderer
    else this.renderers.push(renderer)
  }

  unregister(capability: Capability): void {
    this.renderers = this.renderers.filter((r) => r.capability !== capability)
  }

  list(): readonly CapabilityRenderer[] {
    return this.renderers
  }

  has(capability: Capability): boolean {
    return this.renderers.some((r) => r.capability === capability)
  }

  /**
   * Pick a renderer for this result.
   *
   * Resolution order:
   *  1. `override` capability if present and registered.
   *  2. `capability` hint if present, registered, and `renders(result)` agrees.
   *  3. First renderer whose `renders(result)` returns true.
   *  4. The 'table' renderer (universal fallback).
   *
   * Throws if no renderer matches and no 'table' renderer is registered.
   */
  pick(
    capability: Capability | undefined,
    result: QueryResult,
    override?: Capability,
  ): CapabilityRenderer {
    if (override) {
      const r = this.renderers.find((r) => r.capability === override)
      if (r) return r
    }
    if (capability) {
      const r = this.renderers.find((r) => r.capability === capability)
      if (r && r.renders(result)) return r
    }
    const shapeMatch = this.renderers.find((r) => r.renders(result))
    if (shapeMatch) return shapeMatch
    const fallback = this.renderers.find((r) => r.capability === 'table')
    if (!fallback) {
      throw new Error('No renderer matched and no table fallback is registered')
    }
    return fallback
  }
}

/** Shared singleton — renderers self-register into this from ./index.ts. */
export const registry = new RendererRegistry()
