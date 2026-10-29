<script lang="ts">
  import { Button as DSButton } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from "./workspace-context"
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
  import { devConsole as defaultStore, type ConsoleEntry } from './reddb/index'
  import X from '@lucide/svelte/icons/x'
  import Copy from '@lucide/svelte/icons/copy'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import Check from '@lucide/svelte/icons/check'

  const workspace = useWorkspace()

  let {
    contained = false,
    store = workspace.devConsole,
    open: openProp = false,
  }: {
    contained?: boolean
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
    return workspace.on('red:toggle-dev-console', toggle)
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
    class:fixed={!contained}
    class:absolute={contained}
    class="inset-x-0 bottom-0 z-[9990] flex max-h-[45vh] flex-col border-t border-control-edge bg-elevation-base-surface shadow-2xl"
    role="log"
    aria-label="Developer console"
    data-testid="dev-console"
  >
    <div class="flex items-center justify-between gap-3 border-b border-muted bg-muted/60 px-3 py-1.5">
      <div class="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
        <span class="uppercase tracking-wider text-foreground">Console</span>
        <span class="text-ink-muted" data-testid="dev-console-count">{entries.length} calls</span>
      </div>
      <div class="flex items-center gap-1">
        <DSButton variant="ghost" size="sm"
          type="button"
          onclick={() => store.clear()}
          title="Clear console"
          aria-label="Clear console"

        >
          <DSIcon icon={Trash2} color="current" class="" />
          Clear
        </DSButton>
        <DSButton variant="ghost" size="sm"
          type="button"
          onclick={() => (open = false)}
          title="Close console"
          aria-label="Close console"

        >
          <DSIcon icon={X} color="current" class="" />
        </DSButton>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      {#if ordered.length === 0}
        <div class="grid h-24 place-items-center font-mono text-[12px] text-ink-muted">
          No calls yet — the client hasn't asked the database anything.
        </div>
      {:else}
        <ul class="divide-y divide-line-1/60">
          {#each ordered as entry (entry.id)}
            <li class="group flex items-start gap-2 px-3 py-1.5 font-mono text-[11px] hover:bg-muted/40" data-testid="dev-console-entry">
              <span
                class="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                class:bg-feedback-success-fill={entry.ok}
                class:bg-feedback-danger-fill={!entry.ok}
                aria-hidden="true"
              ></span>
              <span class="w-11 shrink-0 uppercase text-ink-muted">{entry.verb}</span>
              <span class="min-w-0 flex-1">
                <span class="text-foreground">{entry.target}</span>
                {#if entry.payload}
                  <span class="ml-1 text-ink-muted break-all">{entry.payload.replace(/\s+/g, ' ').slice(0, 120)}</span>
                {/if}
                {#if entry.error}
                  <span class="ml-1 text-feedback-danger-foreground break-all">— {entry.error}</span>
                {/if}
              </span>
              {#if entry.rowCount !== undefined}
                <span class="shrink-0 tabular-nums text-ink-muted" title="rows returned">{entry.rowCount}r</span>
              {/if}
              <span class="w-12 shrink-0 text-right tabular-nums text-ink-muted" title="duration">{fmtDuration(entry.durationMs)}</span>
              <DSButton variant="ghost" size="sm"
                type="button"
                onclick={() => copy(entryText(entry), entry.id)}
                title="Copy entry"
                aria-label="Copy entry"
                class="shrink-0"
              >
                {#if copiedId === entry.id}
                  <DSIcon icon={Check} color="current" class=" text-feedback-success-foreground" />
                {:else}
                  <DSIcon icon={Copy} color="current" class="" />
                {/if}
              </DSButton>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
{/if}
