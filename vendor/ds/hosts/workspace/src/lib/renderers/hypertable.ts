import type { CapabilityRenderer } from './types'
import { hasHypertableShape } from './hypertable-render'
import HypertableRenderer from './HypertableRenderer.svelte'

export const hypertableRenderer: CapabilityRenderer = {
  capability: 'hypertable',
  renders: (result) => hasHypertableShape(result),
  component: HypertableRenderer,
}
