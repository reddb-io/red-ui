<script lang="ts">
  // Instrumented developer console panel (#128). A collapsible, bottom-docked
  // log of every query and HTTP call the client made — verb, target, duration,
  // row count — copyable and secret-free. It bridges the framework-agnostic
  // `devConsole` store (deliberately rune-free so the data layer can log
  // without importing Svelte) into reactivity by subscribing and mirroring the
  // snapshot into `$state`.
  //
  // It never steals the accent: status is carried by ok/danger dots and the
  // panel chrome uses the neutral surface ramp, so the one-accent-per-screen
  // rule (design principle #6) holds even while the console is open.
  import { devConsole as defaultStore, type ConsoleEntry } from '#reddb'
  import { X, Copy, Trash2, Check } from 'lucide-svelte'

  let {
    store = defaultStore,
    open: openProp = false,
  }: {
    store?: typeof defaultStore
    open?: boolean
  } = $props()

  // Seed the panel's open state from the prop once; thereafter it's toggled
  // locally by the shell event and the close button.
  // svelte-ignore state_referenced_locally
  let open = $state(openProp)
  let entries = $state<readonly ConsoleEntry[]>([])
  let copiedId = $state<number | null>(null)

  // Bridge the rune-free store into reactivity: subscribe once, mirror every
  // snapshot into local `$state`. The subscribe fires immediately, so the
  // panel paints the current log on mount.
  $effect(() => store.subscribe((snap) => (entries = snap)))

  // Toggle from anywhere in the shell (the StatusBar button dispatches this).
  $effect(() => {
    const toggle = () => (open = !open)
    window.addEventListener('red:toggle-dev-console', toggle)
    return () => window.removeEventListener('red:toggle-dev-console', toggle)
  })

  // Newest first — an operator reads the most recent call at the top.
  const ordered = $derived([...entries].reverse())

  async function copy(text: string, id: number) {
    try {
      await navigator.clipboard?.writeText(text)
      copiedId = id
      setTimeout(() => {
        if (copiedId === id) copiedId = null
      }, 1200)
    } catch {
      // Clipboard denied (insecure context / permissions) — silently no-op.
    }
  }

  function entryText(e: ConsoleEntry): string {
    const head = `${e.verb} ${e.target} → ${e.ok ? (e.status ?? 'ok') : 'error'} · ${e.durationMs}ms${
      e.rowCount === undefined ? '' : ` · ${e.rowCount} rows`
    }`
    const parts = [head]
    if (e.payload) parts.push(e.payload)
    if (e.error) parts.push(e.error)
    return parts.join('\n')
  }

  function fmtDuration(ms: number): string {
    return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`
  }
</script>

{#if open}
  <div
    class="fixed inset-x-0 bottom-0 z-[9990] flex max-h-[45vh] flex-col border-t border-line-2 bg-bg-1 shadow-2xl"
    role="log"
    aria-label="Developer console"
    data-testid="dev-console"
  >
    <div class="flex items-center justify-between gap-3 border-b border-line-1 bg-bg-2/60 px-3 py-1.5">
      <div class="flex items-center gap-2 font-mono text-[11px] text-fg-2">
        <span class="uppercase tracking-wider text-fg-1">Console</span>
        <span class="text-fg-3" data-testid="dev-console-count">{entries.length} calls</span>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          onclick={() => store.clear()}
          title="Clear console"
          aria-label="Clear console"
          class="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11px] text-fg-3 hover:bg-bg-3/60 hover:text-fg-1 transition-colors"
        >
          <Trash2 class="size-3" />
          Clear
        </button>
        <button
          type="button"
          onclick={() => (open = false)}
          title="Close console"
          aria-label="Close console"
          class="inline-flex items-center rounded p-0.5 text-fg-3 hover:bg-bg-3/60 hover:text-fg-1 transition-colors"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      {#if ordered.length === 0}
        <div class="grid h-24 place-items-center font-mono text-[12px] text-fg-3">
          No calls yet — the client hasn't asked the database anything.
        </div>
      {:else}
        <ul class="divide-y divide-line-1/60">
          {#each ordered as entry (entry.id)}
            <li class="group flex items-start gap-2 px-3 py-1.5 font-mono text-[11px] hover:bg-bg-2/40" data-testid="dev-console-entry">
              <span
                class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                class:bg-ok={entry.ok}
                class:bg-danger={!entry.ok}
                aria-hidden="true"
              ></span>
              <span class="w-11 shrink-0 uppercase text-fg-2">{entry.verb}</span>
              <span class="min-w-0 flex-1">
                <span class="text-fg-1">{entry.target}</span>
                {#if entry.payload}
                  <span class="ml-1 text-fg-3 break-all">{entry.payload.replace(/\s+/g, ' ').slice(0, 120)}</span>
                {/if}
                {#if entry.error}
                  <span class="ml-1 text-danger break-all">— {entry.error}</span>
                {/if}
              </span>
              {#if entry.rowCount !== undefined}
                <span class="shrink-0 tabular-nums text-fg-3" title="rows returned">{entry.rowCount}r</span>
              {/if}
              <span class="w-12 shrink-0 text-right tabular-nums text-fg-2" title="duration">{fmtDuration(entry.durationMs)}</span>
              <button
                type="button"
                onclick={() => copy(entryText(entry), entry.id)}
                title="Copy entry"
                aria-label="Copy entry"
                class="shrink-0 rounded p-0.5 text-fg-3 opacity-0 transition-opacity hover:bg-bg-3/60 hover:text-fg-1 group-hover:opacity-100 focus:opacity-100"
              >
                {#if copiedId === entry.id}
                  <Check class="size-3 text-ok" />
                {:else}
                  <Copy class="size-3" />
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
