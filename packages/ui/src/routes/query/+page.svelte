<script lang="ts">
  import { onMount } from 'svelte'
  import Workspace from '$lib/Workspace.svelte'
  import { queryTabs } from '$lib/query-tabs.svelte'
  import { tabs } from '$lib/tabs.svelte'

  onMount(() => {
    const label = queryTabs.nextLabel()
    const tab = tabs.open({ kind: 'query', label, key: label }, true)
    queryTabs.ensure(tab.id)
  })
</script>

<Workspace />
