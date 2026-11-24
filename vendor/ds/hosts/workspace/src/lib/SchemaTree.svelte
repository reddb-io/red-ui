<script lang="ts">
  import { NavItem } from "@reddb-io/design-system/app"
  import { Input as DSInput, Button as DSButton, ToggleButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'

  import {
    CAPABILITY_GLYPHS,
    detectCapabilitiesFromCatalog,
    isInternalCollection,
    type Capability,
  } from './capability'
  import { useRouter } from './router.svelte'
  import Plug from '@lucide/svelte/icons/plug'
  import Lock from '@lucide/svelte/icons/lock'
  import Eye from '@lucide/svelte/icons/eye'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'

  const workspace = useWorkspace()
  const { activity, connection, secureStore } = workspace

  const router = useRouter()

  interface Item {
    name: string
    capability: Capability
  }

  // The router is the source of truth for which collection is selected.
  const activeCollection = $derived(router.collection)

  let items = $state<Item[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)
  let search = $state('')
  let showSystemCollections = $state(false)
  let refreshGeneration = 0
  let capabilityFilter = $state<Capability | 'all'>('all')
  const skeletonRows = Array.from({ length: 10 }, (_, i) => i)

  const connected = $derived(connection.connected)
  const activeUrl = $derived(connection.active.url)
  const capabilityCounts = $derived.by(() => {
    const counts = new Map<Capability, number>()
    for (const item of items) counts.set(item.capability, (counts.get(item.capability) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  })
  const filteredItems = $derived.by(() => {
    const q = search.trim().toLowerCase()
    return items.filter((item) => {
      if (!showSystemCollections && isInternalCollection(item.name)) return false
      if (capabilityFilter !== 'all' && item.capability !== capabilityFilter) return false
      if (!q) return true
      const g = CAPABILITY_GLYPHS[item.capability]
      return item.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)
    })
  })

  async function refresh() {
    const generation = ++refreshGeneration
    const includeSystem = showSystemCollections
    const client = connection.client
    if (!client || !connected) {
      items = []
      return
    }
    loading = true
    error = null
    const token = activeUrl
    try {
      const names = await activity.track('schema · list collections', () => client.collections())
      if (generation !== refreshGeneration || token !== activeUrl) return
      const user = names.filter((n) => includeSystem || !isInternalCollection(n)).sort()
      items = user.map((name) => ({ name, capability: 'table' as Capability }))
      const capabilities = await activity.track(
        'schema · classify collections',
        () => detectCapabilitiesFromCatalog(client, user),
      )
      if (generation !== refreshGeneration || token !== activeUrl) return
      items = items.map((item) => ({
        ...item,
        capability: capabilities.get(item.name) ?? 'table',
      }))
    } catch (e) {
      if (generation !== refreshGeneration || token !== activeUrl) return
      error = (e as Error).message
      items = []
    } finally {
      if (generation === refreshGeneration) loading = false
    }
  }

  $effect(() => {
    // Block all probing until the secure store is unlocked, so the
    // network panel doesn't leak the schema before the user authenticates.
    if (secureStore.requiresUnlock) return
    void connected
    void activeUrl
    void showSystemCollections
    refresh()
  })

</script>

<!-- One row of tools, not a title bar over an options bar over a search bar:
     the panel is already named by its landmark and by the rail. -->
{#if connected && !secureStore.requiresUnlock}
  <div role="group" aria-label="Collection browser options" data-collection-tools
    class="flex items-center gap-[var(--reddb-spatial-gap-xs)] border-b border-elevation-base-border bg-elevation-sunken-surface p-[var(--reddb-spatial-inset-sm)]">
    <DSInput type="search" bind:value={search} aria-label="Search collections" size="sm"
      placeholder="Search" class="min-w-0 flex-1" />
    <ToggleButton label="System collections" pressed={showSystemCollections} onpressedchange={value => showSystemCollections = value}
      title="Include internal RedDB collections" class="shrink-0">
      <DSIcon icon={Eye} color="current" />
    </ToggleButton>
    <DSButton variant="ghost" size="sm" class="shrink-0" aria-label="Refresh collections" title="Refresh collections" onclick={refresh} disabled={loading}><DSIcon icon={RefreshCw} color="current" /></DSButton>
  </div>
{/if}

{#if secureStore.requiresUnlock}
  <div class="p-3 flex flex-col items-start gap-2 text-[12px] text-ink-muted font-mono leading-relaxed">
    <DSIcon icon={Lock} color="current" class=" text-primary-text" />
    <span class="text-foreground">Locked.</span>
    <span>Enter your master password to load the schema.</span>
  </div>
{:else if !connected}
  <div class="p-3 flex flex-col items-start gap-2 text-[12px] text-ink-muted font-mono leading-relaxed">
    <DSIcon icon={Plug} color="current" class=" text-ink-muted" />
    <span>No schema to show.</span>
    <span>Connect to a reddb instance to inspect collections.</span>
  </div>
{:else if error}
  <div class="p-3 text-[12px] text-ink-muted font-mono leading-relaxed">
    <div class="text-ink-muted">Couldn't load collections.</div>
    <div class="mt-1 break-words">{error}</div>
  </div>
{:else if loading && items.length === 0}
  <div class="schema-skeleton" aria-busy="true" aria-label="Loading schema">
    <ul class="py-1" role="presentation">
      {#each skeletonRows as row (row)}
        <li class="flex h-7 items-center gap-2 px-3">
          <div class="h-4 w-4 rounded bg-muted motion-safe:animate-pulse"></div>
          <div class="h-3 rounded bg-muted motion-safe:animate-pulse" style={`width: ${row % 3 === 0 ? 132 : row % 3 === 1 ? 96 : 164}px`}></div>
        </li>
      {/each}
    </ul>
  </div>
{:else if items.length === 0}
  <div class="p-3 flex flex-col items-start gap-2 text-[12px] text-ink-muted font-mono leading-relaxed">
    <span class="text-ink-muted">No collections to show.</span>
    <span>Show system collections or seed the instance to populate the schema.</span>
    <code class="px-2 py-1 bg-muted border border-muted rounded text-[11px]">./scripts/seed.sh {activeUrl}</code>
  </div>
{:else}
  <!-- Type filters only earn a row when there is more than one type. -->
  {#if capabilityCounts.length > 1}
    <div role="group" aria-label="Filter by type" class="flex flex-wrap gap-[var(--reddb-spatial-gap-xs)] border-b border-elevation-base-border p-[var(--reddb-spatial-inset-sm)]">
      <DSButton variant="ghost" size="sm" aria-pressed={capabilityFilter === 'all'} type="button" onclick={() => (capabilityFilter = 'all')}>
        all {items.length}
      </DSButton>
      {#each capabilityCounts as [cap, count] (cap)}
        {@const g = CAPABILITY_GLYPHS[cap]}
        <DSButton variant="ghost" size="sm" aria-pressed={capabilityFilter === cap} type="button"
          onclick={() => (capabilityFilter = cap)} title={g.label}>
          {g.glyph} {count}
        </DSButton>
      {/each}
    </div>
  {/if}
  <ul class="py-1" role="list">
    {#if filteredItems.length === 0}
      <li class="px-3 py-2 font-mono text-[12px] text-ink-muted">No matching collections.</li>
    {/if}
    {#each filteredItems as item (item.name)}
      {@const g = CAPABILITY_GLYPHS[item.capability]}
      {@const active = item.name === activeCollection}
      <!-- Keep the route model-neutral. Workspace resolves the selected
           collection lazily, so catalog-baseline `table` never suppresses a
           document/stats renderer and only the clicked collection is probed. -->
      {@const target = { view: 'collection' as const, collection: item.name }}
      <li>
        <NavItem href={router.href(target)} label={item.name} current={active}
          onclick={(event) => router.go(target, event)} title={`${g.label} · ${item.name}`}>
          {#snippet icon()}<span aria-hidden="true">{g.glyph}</span>{/snippet}
          {#snippet trailing()}<span class="sr-only">{g.label}</span>{/snippet}
        </NavItem>
      </li>
    {/each}
  </ul>
{/if}
