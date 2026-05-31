import type { Component } from 'svelte'
import type { QueryResult, RedClient } from '#reddb'

export type Capability =
  | 'table'
  | 'graph'
  | 'hypertable'
  | 'kv'
  | 'vector'
  | 'queue'
  | 'stats'
  | 'diff'
  | 'document'
  | 'json'

export interface RendererProps {
  result: QueryResult
  collection?: string
  client?: RedClient
  subpage?: string
  /** When true, reddb system fields (rid, collection, kind, tenant,
   * created_at, updated_at) are shown ahead of user fields. Default false:
   * the user-defined shape is what they're trying to read. */
  showSystem?: boolean
}

export interface CapabilityRenderer {
  capability: Capability
  /** Result-shape disambiguation: does this renderer claim this result? */
  renders(result: QueryResult): boolean
  /** Svelte component that paints the result. */
  component: Component<RendererProps>
}
