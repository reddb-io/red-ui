import type { CapabilityRenderer } from './types'
import JsonRenderer from './JsonRenderer.svelte'

export const jsonRenderer: CapabilityRenderer = {
  capability: 'json',
  // JSON never wins by shape detection — it's the universal override.
  // The registry still picks it when the user selects it explicitly.
  renders: () => false,
  component: JsonRenderer,
}
