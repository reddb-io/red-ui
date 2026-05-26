<script lang="ts">
  import type { QueryResult } from '@red-ui/protocol'
  import { highlightJson, prettyJson, projectJson } from './json-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()
  const pretty = $derived(prettyJson(projectJson(result)))
  const html = $derived(highlightJson(pretty))
</script>

<div class="flex h-full flex-col text-fg-1">
  <div class="flex-1 min-h-0 overflow-auto">
    <pre class="json text-[12px] font-mono p-3 leading-relaxed">{@html html}</pre>
  </div>
  <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3">
    {result.record_count} records · raw shape{collection ? ' · ' : ''}{collection ?? ''}
  </div>
</div>

<style>
  .json :global(.k) { color: var(--color-accent); }
  .json :global(.s) { color: var(--color-fg-1); }
  .json :global(.n) { color: #7dd3fc; }
  .json :global(.b) { color: #fbbf24; }
  .json :global(.z) { color: var(--color-fg-3); font-style: italic; }
</style>
