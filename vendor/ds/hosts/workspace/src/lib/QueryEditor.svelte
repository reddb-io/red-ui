<script module lang="ts">
  // Where the reader last left the divider. It is one preference for every
  // query tab, kept for the session; until they move it, the editor is as tall
  // as its statement.
  let chosenFraction = $state<number | null>(null)
  /** Lines the editor shows before the reader has written that many. */
  const RESTING_LINES = 3
  /** The most of the pane a statement takes by its own length. */
  const CONTENT_LIMIT = 0.4
</script>

<script lang="ts">
  import { SplitView } from '@reddb-io/design-system/app'
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
  import type { Snippet } from 'svelte'

  const workspace = useWorkspace()
  const { connection, queryTabs, registry, tabs } = workspace

  interface Props {
    tabId: string
    fallbackLabel: string
    controls?: Snippet
  }

  let { tabId, fallbackLabel, controls }: Props = $props()

  // Ensure qs exists for this tab id.
  $effect(() => {
    queryTabs.ensure(tabId)
  })

  const qs = $derived(queryTabs.states[tabId])
  const tab = $derived(tabs.tabs.find((t) => t.id === tabId))

  let textareaEl: HTMLTextAreaElement | undefined = $state()
  let paneHeight = $state(0)
  let contentFraction = $state(0.2)

  // The editor follows its statement: three lines at rest, growing a line at a
  // time up to two fifths of the pane, so a short query leaves the room to its
  // result. The divider overrides it.
  $effect(() => {
    const lines = Math.max(RESTING_LINES, (qs?.sql ?? '').split('\n').length)
    const field = textareaEl
    const row = field?.parentElement
    if (!field || !row || paneHeight <= 0) return
    const px = (value: string) => Number.parseFloat(value) || 0
    const text = getComputedStyle(field)
    const inset = getComputedStyle(row)
    const height = lines * px(text.lineHeight)
      + px(text.paddingTop) + px(text.paddingBottom) + px(text.borderTopWidth) + px(text.borderBottomWidth)
      + px(inset.paddingTop) + px(inset.paddingBottom) + 1
    contentFraction = Math.min(CONTENT_LIMIT, height / paneHeight)
  })
  const fraction = $derived(chosenFraction ?? contentFraction)
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

<div class="h-full min-h-0" data-query-workspace bind:clientHeight={paneHeight}>
<SplitView orientation="vertical" class="h-full" label="Resize query editor" min={0.1} max={0.8}
  {fraction} onfractionchange={(next) => (chosenFraction = next)}>
  {#snippet start()}
  <section aria-label="Query editor" data-query-editor class="flex h-full min-h-0 flex-col bg-elevation-sunken-surface">
    <!-- One row: the action sits beside the statement it runs, with no bar of
         its own. The connection is named once, in the top bar. -->
    <div class="flex min-h-0 flex-1 items-start gap-[var(--reddb-spatial-gap-sm)] p-[var(--reddb-spatial-inset-sm)]">
      <DSButton variant="primary" size="sm" type="button" onclick={run} class="shrink-0"
        disabled={qs?.running || !connection.connected}
        aria-label={qs?.running ? 'Running query' : 'Run query'} aria-keyshortcuts="Control+Enter Meta+Enter"
        title={connection.connected ? 'Run query (Ctrl/⌘ + Enter)' : 'Connect to run a query'}>
        {#if qs?.running}<DSIcon icon={Loader2} color="current" class="animate-spin" /><span class="hidden sm:inline">Running…</span>
        {:else}<DSIcon icon={Play} color="current" /><span class="hidden sm:inline">Run</span>{/if}
      </DSButton>
      <DSTextarea
        bind:ref={textareaEl}
        aria-label="SQL query"
        class="h-full min-h-0 flex-1 resize-none font-mono focus-visible:-outline-offset-2"
        spellcheck="false"
        autocapitalize="off"
        placeholder={'SELECT * FROM users LIMIT 100'}
        value={qs?.sql ?? ''}
        oninput={(e) => setSql((e.currentTarget as HTMLTextAreaElement).value)}
        onkeydown={onKey}
      ></DSTextarea>
    </div>
  </section>
  {/snippet}

  {#snippet end()}
  <section aria-label="Query results" data-query-results class="flex h-full min-h-0 flex-col overflow-hidden bg-background">
    <div data-query-results-bar class="flex shrink-0 items-center sm:flex-wrap justify-between gap-[var(--reddb-spatial-gap-md)] border-b border-elevation-base-border bg-elevation-sunken-surface px-[var(--reddb-spatial-inset-md)] py-[var(--reddb-spatial-inset-sm)] text-caption">
      <div class="flex min-w-0 items-baseline gap-[var(--reddb-spatial-gap-sm)] whitespace-nowrap">
        <!-- A phone keeps this bar to one row: the count stays, and the
             section's own label names it for assistive technology. -->
        <span class="font-medium max-sm:sr-only">Query results</span>
        {#if qs?.result}<span class="text-ink-muted tabular-nums">{qs.result.record_count.toLocaleString()} rows</span>{/if}
      </div>
      <!-- The display controls change the result, so they sit on its bar. -->
      {@render controls?.()}
    </div>
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
        <div class="min-h-0 flex-1 overflow-auto">
          <Renderer result={qs.result} showSystem={tab?.showSystemColumns ?? false} />
        </div>
      {/if}
    {/if}
  </section>
  {/snippet}
</SplitView>
</div>
