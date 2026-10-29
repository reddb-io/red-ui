import type { CapabilityRenderer } from './types'
import { hasGraphShape } from './graph-render'
import GraphRenderer from './GraphRenderer.svelte'

export const graphRenderer: CapabilityRenderer = {
  capability: 'graph',
  renders: (result) => hasGraphShape(result),
  component: GraphRenderer,
}
