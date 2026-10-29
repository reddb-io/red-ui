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

<div data-renderer="json" class="flex h-full flex-col text-fg-1">
  <div class="flex-1 min-h-0 overflow-auto p-3">
    <CodeBlock code={pretty} language="JSON" grammar={jsonCodeGrammar} regionLabel="JSON result" copyLabel="Copy JSON" />
  </div>
  <div class="border-t border-line-1 px-3 py-1.5 text-[11px] font-mono text-fg-3">
    {result.record_count} records · raw shape{collection ? ' · ' : ''}{collection ?? ''}
  </div>
</div>
