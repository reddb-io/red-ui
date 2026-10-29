<script lang="ts">
  import { CodeBlock } from '@reddb-io/design-system/base'
  import { OutcomeScreen } from '@reddb-io/design-system/app'
  let { message }: { message: string } = $props()
</script>

<div role="alert" aria-label="Query failed" class="min-w-0 overflow-auto">
  <OutcomeScreen outcome="error" title="Query failed" description="Review the statement and database message before running it again." fullPage={false} headingLevel={3} />
  <CodeBlock code={message} regionLabel="Database error" copyLabel="Copy error" />
</div>
