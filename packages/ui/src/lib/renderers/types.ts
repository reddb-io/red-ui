import type { Component } from 'svelte'
import type { QueryResult } from '@red-ui/protocol'

export type Capability =
  | 'table'
  | 'graph'
  | 'hypertable'
  | 'kv'
  | 'vector'
  | 'document'
  | 'json'

export interface RendererProps {
  result: QueryResult
  collection?: string
}

export interface CapabilityRenderer {
  capability: Capability
  /** Result-shape disambiguation: does this renderer claim this result? */
  renders(result: QueryResult): boolean
  /** Svelte component that paints the result. */
  component: Component<RendererProps>
}
