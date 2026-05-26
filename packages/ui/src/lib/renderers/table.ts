import type { CapabilityRenderer } from './types'
import TableRenderer from './TableRenderer.svelte'

export const tableRenderer: CapabilityRenderer = {
  capability: 'table',
  // Table is the universal fallback — it can paint any shaped result that
  // has `columns` and `records`. The registry uses this both for hint
  // matches and as the last-resort default.
  renders: (result) => !!result?.result && Array.isArray(result.result.columns),
  component: TableRenderer,
}
