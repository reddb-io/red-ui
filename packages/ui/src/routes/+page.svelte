<script lang="ts">
  import { tabs } from '$lib/tabs.svelte'
  import SchemaTree from '$lib/SchemaTree.svelte'
  import ResultsPane from '$lib/ResultsPane.svelte'
  import type { Capability } from '$lib/capability'

  function openCollection(name: string, capability: Capability, forceNew: boolean) {
    tabs.open(
      {
        kind: 'collection',
        label: name,
        key: name,
        capability,
      },
      forceNew,
    )
  }
</script>

<div class="h-full grid grid-cols-[260px_1fr] bg-bg-0 text-fg-1">
  <aside class="row-start-1 col-start-1 border-r border-line-1 bg-bg-0 overflow-y-auto">
    <SchemaTree onopen={openCollection} />
  </aside>

  <section class="row-start-1 col-start-2 bg-bg-0 overflow-hidden">
    <ResultsPane />
  </section>
</div>
