<script lang="ts">
  import { Play, Loader2 } from 'lucide-svelte'
  import { connection } from '$lib/connections.svelte'
  import { queryTabs, deriveQueryLabel } from '$lib/query-tabs.svelte'
  import { tabs } from '$lib/tabs.svelte'
  import { registry } from '$lib/renderers'
  import type { Capability } from '$lib/renderers'
  import { Kbd } from '@reddb-io/ui-kit'

  interface Props {
    tabId: string
    fallbackLabel: string
  }

  let { tabId, fallbackLabel }: Props = $props()

  // Ensure qs exists for this tab id.
  $effect(() => {
    queryTabs.ensure(tabId)
  })

  const qs = $derived(queryTabs.states[tabId])
  const tab = $derived(tabs.tabs.find((t) => t.id === tabId))

  let textareaEl: HTMLTextAreaElement | undefined = $state()

  function setSql(value: string) {
    queryTabs.setSql(tabId, value)
    // Re-derive label live as the user types.
    const label = deriveQueryLabel(value, fallbackLabel)
    const tab = tabs.tabs.find((t) => t.id === tabId)
    if (tab && tab.label !== label) tabs.rename(tabId, label)
  }

  async function run() {
    await queryTabs.run(tabId)
  }

  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void run()
    }
  }

  function pickRenderer() {
    if (!qs?.result) return null
    return registry.pick(qs.result.capability as Capability | undefined, qs.result, tab?.overrideCapability)
  }
</script>

<div class="flex h-full flex-col">
  <div class="flex flex-col border-b border-line-1 bg-bg-0" style="height: 40%;">
    <div class="flex items-center justify-between px-3 py-1.5 border-b border-line-1">
      <div class="flex items-center gap-2 text-fg-3 type-label">
        <span>SQL</span>
        {#if connection.connected}
          <span class="text-fg-3">·</span>
          <span class="text-fg-2 font-mono text-[11px] truncate max-w-[280px]">{connection.active.url}</span>
        {:else}
          <span class="text-warn font-mono text-[11px]">disconnected</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-fg-3 font-mono text-[11px] hidden sm:inline">Run with <Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded border border-accent/60 bg-accent/10 px-2 py-1 text-[12px] font-mono text-accent hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
          onclick={run}
          disabled={qs?.running || !connection.connected}
          aria-label="Run query"
        >
          {#if qs?.running}
            <Loader2 class="size-3.5 animate-spin" />
            <span>Running…</span>
          {:else}
            <Play class="size-3.5" />
            <span>Run</span>
          {/if}
        </button>
      </div>
    </div>
    <textarea
      bind:this={textareaEl}
      class="flex-1 resize-none bg-bg-0 px-3 py-2 font-mono text-[13px] text-fg-1 outline-none placeholder:text-fg-3"
      spellcheck="false"
      autocapitalize="off"
      placeholder={'SELECT * FROM users LIMIT 100'}
      value={qs?.sql ?? ''}
      oninput={(e) => setSql((e.currentTarget as HTMLTextAreaElement).value)}
      onkeydown={onKey}
    ></textarea>
  </div>

  <div class="flex-1 overflow-hidden bg-bg-0">
    {#if qs?.error}
      <div class="p-4 text-[12px] font-mono text-warn">
        <div class="font-semibold mb-1">Query failed</div>
        <pre class="whitespace-pre-wrap">{qs.error}</pre>
      </div>
    {:else if qs?.running && !qs.result}
      <div class="h-full grid place-items-center text-fg-3 text-[12px] font-mono">
        Running…
      </div>
    {:else if !qs?.result}
      <div class="h-full grid place-items-center text-fg-3 text-[12px] font-mono">
        Run a query to see results here.
      </div>
    {:else}
      {@const renderer = pickRenderer()}
      {#if renderer}
        {@const Renderer = renderer.component}
        <Renderer result={qs.result} showSystem={tab?.showSystemColumns ?? false} />
      {/if}
    {/if}
  </div>
</div>
