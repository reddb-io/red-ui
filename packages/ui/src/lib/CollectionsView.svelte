<script lang="ts">
  import ApplicationWorkspace from '@reddb-io/design-system/app/ApplicationWorkspace'
  import SchemaTree from './SchemaTree.svelte'
  import ResultsPane from './ResultsPane.svelte'
</script>

<ApplicationWorkspace landmarks={false} label="Collections workspace" navigationLabel="Collections"
  class="h-full grid grid-cols-[260px_1fr] bg-bg-0 text-fg-1"
  navigationClass="row-start-1 col-start-1 border-r border-line-1 bg-bg-0 overflow-y-auto"
  contentClass="row-start-1 col-start-2 bg-bg-0 overflow-hidden">
  {#snippet navigation()}<SchemaTree />{/snippet}
  {#snippet content()}<ResultsPane />{/snippet}
</ApplicationWorkspace>
