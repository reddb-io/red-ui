// Renderer registry — registers the bundled renderers on import.
//
// Consumers should import { registry } from this module rather than
// going through ./registry directly, so this side-effect runs and the
// renderers are always available.

import { registry } from './registry'
import { tableRenderer } from './table'
import { graphRenderer } from './graph'
import { kvRenderer } from './kv'
import { hypertableRenderer } from './hypertable'
import { jsonRenderer } from './json'

registry.register(tableRenderer)
registry.register(graphRenderer)
registry.register(kvRenderer)
registry.register(hypertableRenderer)
registry.register(jsonRenderer)

export { registry, RendererRegistry } from './registry'
export type { Capability, CapabilityRenderer, RendererProps } from './types'
export { tableRenderer } from './table'
export { graphRenderer } from './graph'
export { kvRenderer } from './kv'
export { hypertableRenderer } from './hypertable'
export { jsonRenderer } from './json'
export * from './table-render'
