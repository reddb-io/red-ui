<script lang="ts">
  import { CodeBlock } from "@reddb-io/design-system/base"
  import { Button as DSButton, Textarea as DSTextarea } from '@reddb-io/design-system/base'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import QueryFailure from './QueryFailure.svelte'
  import EmptyState from './EmptyState.svelte'
  import { documentDraft } from '@reddb-io/design-system/base/illustrations'
  import Play from '@lucide/svelte/icons/play'
  import Loader2 from '@lucide/svelte/icons/loader-2'
  import X from '@lucide/svelte/icons/x'

  import { deriveQueryLabel, formatElapsed } from './query-tabs.svelte'

  import type { Capability } from './renderers'
  import { Kbd } from '@reddb-io/design-system/base'

  const workspace = useWorkspace()
  const { connection, queryTabs, registry, tabs } = workspace

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
  let now = $state(Date.now())
  const elapsed = $derived(
    qs?.runningStartedAt ? formatElapsed(Math.max(0, now - qs.runningStartedAt)) : '0ms'
  )

  $effect(() => {
    if (!qs?.running) return
    now = Date.now()
    const id = setInterval(() => {
      now = Date.now()
    }, 100)
    return () => clearInterval(id)
  })

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

  function cancel() {
    queryTabs.cancel(tabId)
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
  <div class="flex flex-col border-b border-muted bg-background" style="height: 40%;">
    <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 border-b border-muted">
      <div class="flex items-center gap-2 text-ink-muted type-label">
        <span>SQL</span>
        {#if connection.connected}
          <span class="text-ink-muted">·</span>
          <span class="text-ink-muted font-mono text-[11px] truncate max-w-[280px]">{connection.active.url}</span>
        {:else}
          <span class="text-feedback-warning-foreground font-mono text-[11px]">disconnected</span>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-ink-muted font-mono text-[11px] hidden sm:inline">Run with <Kbd>⌘</Kbd><Kbd>↵</Kbd></span>
        <DSButton variant="ghost" size="sm"
          type="button"

          onclick={run}
          disabled={qs?.running || !connection.connected}
          aria-label={qs?.running ? "Running query" : "Run query"}
        >
          {#if qs?.running}
            <DSIcon icon={Loader2} color="current" class=" animate-spin" />
            <span>Running…</span>
          {:else}
            <DSIcon icon={Play} color="current" class="" />
            <span>Run</span>
          {/if}
        </DSButton>
      </div>
    </div>
    <DSTextarea
      bind:ref={textareaEl}
      aria-label="SQL query"
      class="flex-1 resize-none"
      spellcheck="false"
      autocapitalize="off"
      placeholder={'SELECT * FROM users LIMIT 100'}
      value={qs?.sql ?? ''}
      oninput={(e) => setSql((e.currentTarget as HTMLTextAreaElement).value)}
      onkeydown={onKey}
    ></DSTextarea>
  </div>

  <div class="flex-1 overflow-hidden bg-background">
    {#if qs?.running}
      <div class="h-full grid place-items-center p-6" aria-live="polite" aria-busy="true">
        <div class="w-full max-w-md rounded border border-muted bg-elevation-base-surface p-4 font-mono">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <div class="flex items-center gap-2 text-foreground text-[13px]">
                <DSIcon icon={Loader2} color="current" class=" animate-spin text-primary-text" />
                <span>Running query</span>
              </div>
              <div class="mt-2 text-[11px] text-ink-muted">
                elapsed <span class="tabular-nums text-ink-muted">{elapsed}</span>
              </div>
            </div>
            <DSButton variant="secondary" size="sm"
              type="button"

              onclick={cancel}
              aria-label="Cancel running query"
            >
              <DSIcon icon={X} color="current" class="" />
              <span>Cancel</span>
            </DSButton>
          </div>
          <div class="mt-3 max-h-24 overflow-hidden rounded bg-background px-2 py-1.5 text-[11px] text-ink-muted">
            <CodeBlock code={qs.sql.trim()} />
          </div>
        </div>
      </div>
    {:else if qs?.error}
      <QueryFailure message={qs.error} />
    {:else if !qs?.result}
      <div class="grid h-full place-items-center overflow-auto p-6">
        <EmptyState illustration={documentDraft} illustrationSize="lg" title="Ready for your first query" message="Write a query above, then run it to inspect its results." />
      </div>
    {:else}
      {#if qs.result.truncated}
        <div class="px-3 py-1.5 border-b border-muted bg-elevation-base-surface text-[11px] font-mono text-ink-muted">
          Streamed first {qs.result.record_count.toLocaleString()} rows — more remain on the server. Add a <span class="text-ink-muted">LIMIT</span> to narrow.
        </div>
      {/if}
      {@const renderer = pickRenderer()}
      {#if renderer}
        {@const Renderer = renderer.component}
        <Renderer result={qs.result} showSystem={tab?.showSystemColumns ?? false} />
      {/if}
    {/if}
  </div>
</div>
