import type { CapabilityRenderer } from './types'
import DocumentRenderer from './DocumentRenderer.svelte'
import { hasDocumentShape } from './document-render'

export const documentRenderer: CapabilityRenderer = {
  capability: 'document',
  renders: hasDocumentShape,
  component: DocumentRenderer,
}
