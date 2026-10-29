<script lang="ts">
  import { CodeBlock, jsonCodeGrammar } from '@reddb-io/design-system/base'
  import type { QueryResult } from '#reddb'
  import { prettyJson, projectJson } from './json-render'

  interface Props {
    result: QueryResult
    collection?: string
  }

  let { result, collection }: Props = $props()
  const pretty = $derived(prettyJson(projectJson(result)))
</script>

<div data-renderer="json" class="flex h-full flex-col text-foreground">
  <div class="flex-1 min-h-0 overflow-auto p-[var(--reddb-spatial-inset-md)]">
    <CodeBlock code={pretty} language="JSON" grammar={jsonCodeGrammar} regionLabel="JSON result" copyLabel="Copy JSON" />
  </div>
  <div class="border-t border-muted px-[var(--reddb-spatial-inset-sm)] py-[var(--reddb-spatial-inset-sm)] text-xs font-mono text-ink-muted">
    {result.record_count} records · raw shape{collection ? ' · ' : ''}{collection ?? ''}
  </div>
</div>
