import type { CapabilityRenderer } from './types'
import { hasVectorShape } from './vector-render'
import VectorRenderer from './VectorRenderer.svelte'

export const vectorRenderer: CapabilityRenderer = {
  capability: 'vector',
  renders: (result) => hasVectorShape(result),
  component: VectorRenderer,
}
