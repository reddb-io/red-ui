<script lang="ts">
  import { Badge, Card, LoadingIndicator, StatusIndicator } from '@reddb-io/design-system/base'
  import { useWorkspace } from "./workspace-context"
  // Step-logged loading overlay (#127). While a connection open is in flight it
  // shows an elapsed badge and a scrolling log of the real steps the connect
  // sequence appended (spawn, readiness, handshake, initial stats/schema). A
  // stalled step reads as stalled — the last (active) step stays on screen and
  // its elapsed keeps counting. Live-or-empty: it renders only real steps from
  // the `loading` store, never fabricated progress.
  //
  // Flash guard: fast opens never paint the overlay. We only reveal after
  // `revealAfterMs` of continuous loading; an open that finishes under the
  // threshold clears the store before the reveal timer fires, so nothing shows.
  import { loading as defaultStore, formatElapsed, type LoadingStep } from './loading.svelte'

  const workspace = useWorkspace()

  let {
    contained = false,
    store = workspace.loading,
    revealAfterMs = 400,
  }: {
    contained?: boolean
    store?: typeof defaultStore
    revealAfterMs?: number
  } = $props()

  let revealed = $state(false)
  let now = $state(0)

  // Drive the reveal threshold and the ticking elapsed badge off the store's
  // active flag. Both timers are torn down the instant the open finishes, so a
  // sub-threshold open never flips `revealed` true.
  $effect(() => {
    if (!store.active) {
      revealed = false
      return
    }
    now = Date.now()
    const reveal = setTimeout(() => (revealed = true), revealAfterMs)
    const tick = setInterval(() => (now = Date.now()), 100)
    return () => {
      clearTimeout(reveal)
      clearInterval(tick)
    }
  })

  const elapsed = $derived(store.active ? store.elapsedMs(now) : 0)

  function stepElapsed(step: LoadingStep): number {
    if (step.durationMs !== null) return step.durationMs
    return Math.max(0, now - step.startedAt)
  }
</script>

{#if store.active && revealed}
  <div
    class:fixed={!contained}
    class:absolute={contained}
    class="inset-0 z-[9998] grid place-items-center bg-background/95"
    role="status"
    aria-live="polite"
    aria-busy="true"
    data-testid="loading-overlay"
  >
    <Card class="w-[min(460px,90vw)]" raised>
      {#snippet header()}
        <div class="flex items-center justify-between gap-3">
          <LoadingIndicator label={store.label ?? 'Opening connection'} />
          <Badge data-testid="loading-elapsed">{formatElapsed(elapsed)}</Badge>
        </div>
      {/snippet}
      <ol class="mt-4 max-h-[220px] space-y-1.5 overflow-y-auto" data-testid="loading-steps">
        {#each store.steps as step (step.id)}
          <li class="flex items-start gap-2 font-mono text-[12px]" data-testid="loading-step">
            <StatusIndicator label={step.status === 'active' ? 'In progress' : step.status === 'done' ? 'Completed' : 'Failed'}
              showLabel={false} tone={step.status === 'active' ? 'info' : step.status === 'done' ? 'success' : 'danger'} />
            <span class="min-w-0 flex-1">
              <span
                class="text-foreground"
                class:text-foreground={step.status === 'active'}
                class:text-feedback-danger-foreground={step.status === 'error'}
              >{step.label}</span>
              {#if step.detail}
                <span class="ml-1 text-ink-muted">{step.detail}</span>
              {/if}
              {#if step.error}
                <span class="ml-1 text-feedback-danger-foreground">— {step.error}</span>
              {/if}
            </span>
            <span class="shrink-0 tabular-nums text-ink-muted" data-testid="loading-step-elapsed">
              {formatElapsed(stepElapsed(step))}
            </span>
          </li>
        {/each}
      </ol>
    </Card>
  </div>
{/if}
