<script lang="ts">
  import { StateIllustration } from '@reddb-io/design-system/base'
  import { maintenance } from '@reddb-io/design-system/base/illustrations'

  let { message }: { message: string } = $props()
</script>

<div role="alert" aria-label="Query failed" class="flex min-w-0 flex-wrap items-start gap-[var(--reddb-spatial-gap-lg)] overflow-auto p-[var(--reddb-spatial-inset-lg)]">
  <StateIllustration art={maintenance} size="sm" />
  <div class="min-w-0 flex-1 basis-64">
    <h3 class="type-h2 m-0">Query failed</h3>
    <p class="my-2 text-sm text-fg-2">Review the statement and database message before running it again.</p>
    <pre class="m-0 max-w-full whitespace-pre-wrap break-words rounded-md border border-line-1 bg-bg-1 p-3 font-mono text-xs text-warn">{message}</pre>
  </div>
</div>
