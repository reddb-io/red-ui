<script lang="ts">
  import { connection } from './connections.svelte'
  import {
    CAPABILITY_GLYPHS,
    detectCapability,
    isInternalCollection,
    type Capability,
  } from './capability'
  import { Plug, Database } from 'lucide-svelte'

  interface Props {
    onopen?: (collection: string, capability: Capability) => void
  }
  let { onopen }: Props = $props()

  interface Item {
    name: string
    capability: Capability
  }

  let items = $state<Item[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)

  const connected = $derived(connection.connected)
  const activeUrl = $derived(connection.active.url)

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
      const names = await client.collections()
      const user = names.filter((n) => !isInternalCollection(n)).sort()
      // Render the list first with `table` defaults so the user sees structure
      // immediately, then patch in detected capabilities as each probe lands.
      items = user.map((name) => ({ name, capability: 'table' as Capability }))
      const probes = user.map(async (name) => {
        const cap = await detectCapability(client, name)
        if (token !== activeUrl) return
        items = items.map((it) => (it.name === name ? { ...it, capability: cap } : it))
      })
      await Promise.all(probes)
    } catch (e) {
      error = (e as Error).message
      items = []
    } finally {
      loading = false
    }
  }

  $effect(() => {
    // Re-probe on active connection change. Touching both deps keeps Svelte
    // tracking honest if connected flips while the URL stays put.
    void connected
    void activeUrl
    refresh()
  })
</script>

<div class="px-3 py-2 border-b border-line-1 flex items-center justify-between text-fg-3">
  <div class="flex items-center gap-2">
    <Database class="size-3.5" />
    <span class="type-label">Schema</span>
  </div>
  {#if connected && items.length > 0}
    <span class="font-mono text-[10px] text-fg-3">{items.length}</span>
  {/if}
</div>

{#if !connected}
  <div class="p-3 flex flex-col items-start gap-2 text-[12px] text-fg-3 font-mono leading-relaxed">
    <Plug class="size-4 text-fg-3" />
    <span>No schema to show.</span>
    <span>Connect to a reddb instance to inspect collections.</span>
  </div>
{:else if error}
  <div class="p-3 text-[12px] text-fg-3 font-mono leading-relaxed">
    <div class="text-fg-2">Couldn't load collections.</div>
    <div class="mt-1 break-words">{error}</div>
  </div>
{:else if loading && items.length === 0}
  <div class="p-3 text-[12px] text-fg-3 font-mono">Loading…</div>
{:else if items.length === 0}
  <div class="p-3 flex flex-col items-start gap-2 text-[12px] text-fg-3 font-mono leading-relaxed">
    <span class="text-fg-2">No user collections.</span>
    <span>Seed the instance to populate the schema.</span>
    <code class="px-2 py-1 bg-bg-2 border border-line-1 rounded text-[11px]">./scripts/seed.sh {activeUrl}</code>
  </div>
{:else}
  <ul class="py-1" role="list">
    {#each items as item (item.name)}
      {@const g = CAPABILITY_GLYPHS[item.capability]}
      <li>
        <button
          type="button"
          class="w-full flex items-center gap-2 px-3 py-1 text-left font-mono text-[12px] text-fg-2 hover:bg-bg-1 hover:text-fg-0 focus:bg-bg-1 focus:text-fg-0 focus:outline-none transition-colors"
          title={`${g.label} · ${item.name}`}
          onclick={() => onopen?.(item.name, item.capability)}
        >
          <span class="inline-block w-4 text-center text-fg-3" aria-hidden="true">{g.glyph}</span>
          <span class="truncate">{item.name}</span>
          <span class="sr-only">{g.label}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}
