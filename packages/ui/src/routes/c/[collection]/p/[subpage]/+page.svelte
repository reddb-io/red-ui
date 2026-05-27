<script lang="ts">
  import { untrack } from 'svelte'
  import { page } from '$app/state'
  import { tabs } from '$lib/tabs.svelte'
  import { connection } from '$lib/connections.svelte'
  import { detectCapability } from '$lib/capability'
  import Workspace from '$lib/Workspace.svelte'

  async function syncTab(name: string, subpage: string) {
    const existing = tabs.tabs.find((t) => t.kind === 'collection' && t.key === name)
    if (existing) {
      tabs.open({
        kind: 'collection',
        label: name,
        key: name,
        capability: existing.capability,
        overrideCapability: existing.overrideCapability,
        showSystemColumns: existing.showSystemColumns,
        subpage,
      })
    } else {
      tabs.open({ kind: 'collection', label: name, key: name, capability: 'table', subpage })
    }

    const client = connection.client
    if (!client) return
    try {
      const cap = await detectCapability(client, name)
      const t = tabs.tabs.find((x) => x.kind === 'collection' && x.key === name)
      if (t) tabs.tabs = tabs.tabs.map((x) => (x === t ? { ...x, capability: cap, subpage } : x))
    } catch {
      // detection failure is non-fatal; table remains the baseline.
    }
  }

  $effect(() => {
    const name = page.params.collection
    const subpage = page.params.subpage
    if (name && subpage) {
      untrack(() => { void syncTab(decodeURIComponent(name), decodeURIComponent(subpage)) })
    }
  })
</script>

<Workspace />
