import DiffRenderer from './DiffRenderer.svelte'
import { hasDiffShape } from './diff-render'
import type { CapabilityRenderer } from './types'

export const diffRenderer: CapabilityRenderer = {
  capability: 'diff',
  renders: hasDiffShape,
  component: DiffRenderer,
}
