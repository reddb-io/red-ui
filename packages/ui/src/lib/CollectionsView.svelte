<script lang="ts">
  import SchemaTree from './SchemaTree.svelte'
  import ResultsPane from './ResultsPane.svelte'
</script>

<div class="h-full grid grid-cols-[260px_1fr] bg-bg-0 text-fg-1">
  <aside class="row-start-1 col-start-1 border-r border-line-1 bg-bg-0 overflow-y-auto">
    <SchemaTree />
  </aside>

  <section class="row-start-1 col-start-2 bg-bg-0 overflow-hidden">
    <ResultsPane />
  </section>
</div>
