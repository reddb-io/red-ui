import type { CapabilityRenderer } from './types'
import { hasKvShape } from './kv-render'
import KvRenderer from './KvRenderer.svelte'

export const kvRenderer: CapabilityRenderer = {
  capability: 'kv',
  renders: (result) => hasKvShape(result),
  component: KvRenderer,
}
