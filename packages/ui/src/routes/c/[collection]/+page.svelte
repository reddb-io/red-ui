<script lang="ts">
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { tabs } from '$lib/tabs.svelte'
  import { connection } from '$lib/connections.svelte'
  import { detectCapability } from '$lib/capability'
  import { collectionPageHref, defaultSubpage } from '$lib/collection-pages'
  import Workspace from '$lib/Workspace.svelte'

  // Open (or focus) the tab for the collection named in the URL. The
  // capability is detected lazily so the renderer picks the right shape
  // when the client is connected; until then the tab opens as 'table'
  // and gets upgraded when probing completes.
  async function syncTab(name: string) {
    const existing = tabs.tabs.find((t) => t.kind === 'collection' && t.key === name)
    if (existing) {
      tabs.focus(existing.id)
      if (existing.capability) {
        goto(collectionPageHref(name, defaultSubpage(existing.capability)), { replaceState: true })
      }
      return
    }
    tabs.open({ kind: 'collection', label: name, key: name, capability: 'table' })
    const client = connection.client
    if (!client) return
    try {
      const cap = await detectCapability(client, name)
      // Re-find the tab — it may have been replaced or kept; either way
      // we patch the capability on the still-matching tab.
      const t = tabs.tabs.find((x) => x.kind === 'collection' && x.key === name)
      if (t) tabs.tabs = tabs.tabs.map((x) => (x === t ? { ...x, capability: cap } : x))
      goto(collectionPageHref(name, defaultSubpage(cap)), { replaceState: true })
    } catch {
      // detection failure is non-fatal — capability stays 'table'.
      goto(collectionPageHref(name, 'table'), { replaceState: true })
    }
  }

  $effect(() => {
    const name = page.params.collection
    if (name) untrack(() => { void syncTab(decodeURIComponent(name)) })
  })
</script>

<Workspace />
