import type { CapabilityRenderer } from './types'
import { hasQueueShape } from './queue-render'
import QueueRenderer from './QueueRenderer.svelte'

export const queueRenderer: CapabilityRenderer = {
  capability: 'queue',
  renders: (result) => hasQueueShape(result),
  component: QueueRenderer,
}
