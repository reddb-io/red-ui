<script lang="ts">
  import ApplicationWorkspace from '@reddb-io/design-system/app/ApplicationWorkspace'
  import { Popover } from '@reddb-io/design-system/base'
  import SchemaTree from './SchemaTree.svelte'
  import ResultsPane from './ResultsPane.svelte'
</script>

<ApplicationWorkspace landmarks={false} label="Collections workspace" navigationLabel="Collections"
  class="h-full bg-background text-foreground"
  navigationClass="hidden @3xl/application-workspace:block"
  contentClass="overflow-hidden">
  {#snippet navigation()}<SchemaTree />{/snippet}
  {#snippet toolbar()}
    <div class="p-[var(--reddb-spatial-inset-sm)] @3xl/application-workspace:hidden">
      <Popover triggerLabel="Browse collections" contentLabel="Collections" align="start" class="max-h-[60vh] overflow-auto">
        <SchemaTree />
      </Popover>
    </div>
  {/snippet}
  {#snippet content()}<div class="min-h-0 flex-1"><ResultsPane /></div>{/snippet}
</ApplicationWorkspace>
