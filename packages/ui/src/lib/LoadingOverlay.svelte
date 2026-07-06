<script lang="ts">
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

  let {
    store = defaultStore,
    revealAfterMs = 400,
  }: {
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
    class="fixed inset-0 z-[9998] grid place-items-center bg-bg-0/85 backdrop-blur-sm"
    role="status"
    aria-live="polite"
    aria-busy="true"
    data-testid="loading-overlay"
  >
    <div class="w-[min(460px,90vw)] rounded-lg border border-line-2 bg-bg-1 p-5 shadow-2xl">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <span
            class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent shadow-[0_0_12px_var(--color-accent-glow)] motion-reduce:animate-none"
          ></span>
          <span class="truncate font-mono text-[13px] font-semibold text-fg-0">
            {store.label ?? 'Opening connection'}
          </span>
        </div>
        <span
          class="shrink-0 rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[12px] tabular-nums text-fg-2"
          data-testid="loading-elapsed"
        >
          {formatElapsed(elapsed)}
        </span>
      </div>

      <ol class="mt-4 max-h-[220px] space-y-1.5 overflow-y-auto" data-testid="loading-steps">
        {#each store.steps as step (step.id)}
          <li class="flex items-start gap-2 font-mono text-[12px]" data-testid="loading-step">
            <span
              class="mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full"
              class:bg-accent={step.status === 'active'}
              class:animate-pulse={step.status === 'active'}
              class:motion-reduce:animate-none={step.status === 'active'}
              class:bg-ok={step.status === 'done'}
              class:bg-danger={step.status === 'error'}
              aria-hidden="true"
            ></span>
            <span class="min-w-0 flex-1">
              <span
                class="text-fg-1"
                class:text-fg-0={step.status === 'active'}
                class:text-danger={step.status === 'error'}
              >{step.label}</span>
              {#if step.detail}
                <span class="ml-1 text-fg-3">{step.detail}</span>
              {/if}
              {#if step.error}
                <span class="ml-1 text-danger">— {step.error}</span>
              {/if}
            </span>
            <span class="shrink-0 tabular-nums text-fg-3" data-testid="loading-step-elapsed">
              {formatElapsed(stepElapsed(step))}
            </span>
          </li>
        {/each}
      </ol>
    </div>
  </div>
{/if}
