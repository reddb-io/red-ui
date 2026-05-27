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
import { vectorRenderer } from './vector'
import { queueRenderer } from './queue'
import { statsRenderer } from './stats'
import { diffRenderer } from './diff'
import { documentRenderer } from './document'

registry.register(tableRenderer)
registry.register(graphRenderer)
registry.register(kvRenderer)
registry.register(hypertableRenderer)
registry.register(vectorRenderer)
registry.register(queueRenderer)
registry.register(statsRenderer)
registry.register(diffRenderer)
registry.register(documentRenderer)
registry.register(jsonRenderer)

export { registry, RendererRegistry } from './registry'
export type { Capability, CapabilityRenderer, RendererProps } from './types'
export { tableRenderer } from './table'
export { graphRenderer } from './graph'
export { kvRenderer } from './kv'
export { hypertableRenderer } from './hypertable'
export { jsonRenderer } from './json'
export { vectorRenderer } from './vector'
export { queueRenderer } from './queue'
export { statsRenderer } from './stats'
export { diffRenderer } from './diff'
export { documentRenderer } from './document'
export * from './table-render'
