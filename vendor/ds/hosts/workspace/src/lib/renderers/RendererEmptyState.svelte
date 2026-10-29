<script lang="ts">
  import type { Snippet } from 'svelte'
  import { EmptyState, StateIllustration } from '@reddb-io/design-system/base'
  import type { StateIllustrationAsset } from '@reddb-io/design-system/base/illustrations'

  interface Props {
    surface: 'table' | 'graph' | 'queue' | 'document'
    reason?: 'empty' | 'filtered' | 'unsupported'
    art: StateIllustrationAsset
    title: string
    description: string
    actions?: Snippet
  }
  let {surface,reason='empty',art,title,description,actions}:Props=$props()
</script>

<div data-renderer-empty={surface} data-empty-reason={reason} class="grid min-h-0 min-w-0 flex-1 place-items-center overflow-auto p-[var(--reddb-spatial-inset-md)]">
  <EmptyState {title} {description} {actions} bordered={false} class="w-full">
    {#snippet media()}<StateIllustration {art} size={reason === 'filtered' ? 'sm' : 'md'} />{/snippet}
  </EmptyState>
</div>
