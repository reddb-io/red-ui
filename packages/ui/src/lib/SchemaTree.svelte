<script lang="ts">
  import { connection } from '$lib/connections.svelte'
  import { Table2, Plug, Loader2 } from 'lucide-svelte'

  interface Props {
    onOpen: (collection: string, forceNew: boolean) => void
  }

  let { onOpen }: Props = $props()

  let collections = $state<string[]>([])
  let loading = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    const client = connection.client
    if (!connection.connected || !client) {
      collections = []
      return
    }
    loading = true
    error = null
    client
      .collections()
      .then((cs) => {
        collections = cs.filter((c) => !c.startsWith('red.') && !c.startsWith('red_'))
        loading = false
      })
      .catch((e) => {
        error = (e as Error).message
        loading = false
      })
  })

  function handleClick(e: MouseEvent, name: string) {
    const forceNew = e.metaKey || e.ctrlKey
    onOpen(name, forceNew)
  }
</script>

<div class="h-full flex flex-col">
  <div class="px-3 py-2 border-b border-line-1 flex items-center gap-2 text-fg-3">
    <Table2 class="size-3.5" />
    <span class="type-label">Schema</span>
    {#if collections.length > 0}
      <span class="ml-auto text-[10px] font-mono text-fg-3">{collections.length}</span>
    {/if}
  </div>

  <div class="flex-1 overflow-y-auto py-1">
    {#if !connection.connected}
      <div class="px-3 py-3 flex flex-col items-start gap-2 text-[12px] text-fg-3 font-mono leading-relaxed">
        <Plug class="size-4 text-fg-3" />
        <span>No schema to show.</span>
        <span>Connect to a reddb instance to inspect collections.</span>
      </div>
    {:else if loading}
      <div class="px-3 py-3 flex items-center gap-2 text-[12px] text-fg-3 font-mono">
        <Loader2 class="size-3.5 animate-spin" />
        <span>Loading collections…</span>
      </div>
    {:else if error}
      <div class="px-3 py-3 text-[12px] text-warn font-mono">
        {error}
      </div>
    {:else if collections.length === 0}
      <div class="px-3 py-3 text-[12px] text-fg-3 font-mono">
        No user collections. Seed one with <code>./scripts/seed.sh</code>.
      </div>
    {:else}
      {#each collections as name}
        <button
          type="button"
          class="w-full text-left px-3 py-1.5 text-[12px] font-mono text-fg-2 hover:bg-bg-1/60 hover:text-fg-1 flex items-center gap-2"
          onclick={(e) => handleClick(e, name)}
          title="Click to open · Cmd/Ctrl+click for new tab"
        >
          <Table2 class="size-3 text-fg-3 shrink-0" />
          <span class="truncate">{name}</span>
        </button>
      {/each}
    {/if}
  </div>
</div>
