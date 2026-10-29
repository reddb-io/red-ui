import type { CapabilityRenderer } from './types'
import { hasStatsShape } from './stats-render'
import StatsRenderer from './StatsRenderer.svelte'

export const statsRenderer: CapabilityRenderer = {
  capability: 'stats',
  renders: (result) => hasStatsShape(result),
  component: StatsRenderer,
}
