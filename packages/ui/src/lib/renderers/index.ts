// Renderer registry — registers the bundled renderers on import.
//
// Consumers should import { registry } from this module rather than
// going through ./registry directly, so this side-effect runs and the
// 'table' fallback is always available.

import { registry } from './registry'
import { tableRenderer } from './table'

registry.register(tableRenderer)

export { registry, RendererRegistry } from './registry'
export type { Capability, CapabilityRenderer, RendererProps } from './types'
export { tableRenderer } from './table'
export * from './table-render'
