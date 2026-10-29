<script lang="ts">
  import { NavItem } from "@reddb-io/design-system/app"
  import { Input as DSInput, Button as DSButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'

  import {
    CAPABILITY_GLYPHS,
    detectCapability,
    isInternalCollection,
    type Capability,
  } from './capability'
  import { defaultSubpage } from './collection-pages'
  import { useRouter } from './router.svelte'
  import Plug from '@lucide/svelte/icons/plug'
  import Database from '@lucide/svelte/icons/database'
  import Lock from '@lucide/svelte/icons/lock'
  import Search from '@lucide/svelte/icons/search'
  import X from '@lucide/svelte/icons/x'

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
  let capabilityFilter = $state<Capability | 'all'>('all')
  const skeletonRows = Array.from({ length: 10 }, (_, i) => i)
  const skeletonChips = Array.from({ length: 4 }, (_, i) => i)

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
      if (capabilityFilter !== 'all' && item.capability !== capabilityFilter) return false
      if (!q) return true
      const g = CAPABILITY_GLYPHS[item.capability]
      return item.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)
    })
  })

  async function refresh() {
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
      const user = names.filter((n) => !isInternalCollection(n)).sort()
      items = user.map((name) => ({ name, capability: 'table' as Capability }))
      const probes = user.map((name) =>
        activity.track(`schema · probe ${name}`, async () => {
          const cap = await detectCapability(client, name)
          if (token !== activeUrl) return
          items = items.map((it) => (it.name === name ? { ...it, capability: cap } : it))
        }),
      )
      await Promise.all(probes)
    } catch (e) {
      error = (e as Error).message
      items = []
    } finally {
      loading = false
    }
  }

  $effect(() => {
    // Block all probing until the secure store is unlocked, so the
    // network panel doesn't leak the schema before the user authenticates.
    if (secureStore.locked) return
    void connected
    void activeUrl
    refresh()
  })

</script>

<div class="px-3 py-2 border-b border-muted flex items-center justify-between text-ink-muted">
  <div class="flex items-center gap-2">
    <DSIcon icon={Database} color="current" class="" />
    <span class="type-label">Schema</span>
  </div>
  {#if connected && items.length > 0}
    <span class="font-mono text-[10px] text-ink-muted">{items.length}</span>
  {/if}
</div>

{#if secureStore.locked}
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
    <div class="p-2 border-b border-muted grid gap-2">
      <div class="flex items-center gap-1.5 h-7 rounded border border-muted bg-background px-2">
        <DSIcon icon={Search} color="current" class=" text-ink-muted" />
        <div class="h-3 w-32 rounded bg-muted motion-safe:animate-pulse"></div>
      </div>

      <div class="flex flex-wrap gap-1">
        {#each skeletonChips as chip (chip)}
          <div class="h-5 rounded border border-muted bg-elevation-base-surface px-1.5 motion-safe:animate-pulse" style={`width: ${chip === 0 ? 42 : 28 + chip * 8}px`}></div>
        {/each}
      </div>
    </div>

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
    <span class="text-ink-muted">No user collections.</span>
    <span>Seed the instance to populate the schema.</span>
    <code class="px-2 py-1 bg-muted border border-muted rounded text-[11px]">./scripts/seed.sh {activeUrl}</code>
  </div>
{:else}
  <div class="p-2 border-b border-muted grid gap-2">
    <div class="flex items-center gap-1.5 h-7 rounded border border-muted bg-background px-2 text-[11px] font-mono">
      <DSIcon icon={Search} color="current" class=" text-ink-muted" />
      <DSInput
        type="text"
        bind:value={search}
        aria-label="Search collections"
        placeholder="search collections…"
        class="min-w-0 flex-1"
      />
      {#if search}
        <DSButton variant="ghost" size="sm" type="button"  aria-label="Clear collection search" onclick={() => (search = '')}>
          <DSIcon icon={X} color="current" class="" />
        </DSButton>
      {/if}
    </div>

    <div class="flex flex-wrap gap-1">
      <DSButton variant="ghost" size="sm" aria-pressed={capabilityFilter === 'all'}
        type="button"
        onclick={() => (capabilityFilter = 'all')}

      >
        all {items.length}
      </DSButton>
      {#each capabilityCounts as [cap, count] (cap)}
        {@const g = CAPABILITY_GLYPHS[cap]}
        <DSButton variant="ghost" size="sm" aria-pressed={capabilityFilter === cap}
          type="button"
          onclick={() => (capabilityFilter = cap)}
          title={g.label}

        >
          {g.glyph} {count}
        </DSButton>
      {/each}
    </div>
  </div>
  <ul class="py-1" role="list">
    {#if filteredItems.length === 0}
      <li class="px-3 py-2 font-mono text-[12px] text-ink-muted">No matching collections.</li>
    {/if}
    {#each filteredItems as item (item.name)}
      {@const g = CAPABILITY_GLYPHS[item.capability]}
      {@const active = item.name === activeCollection}
      {@const target = { view: 'collection' as const, collection: item.name, subpage: defaultSubpage(item.capability) }}
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
