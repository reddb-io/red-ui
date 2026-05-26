<script lang="ts">
  import { activity } from './activity.svelte'
  import { Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-svelte'

  let open = $state(false)

  function fmtDuration(ms: number | null): string {
    if (ms === null) return '…'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  function fmtRel(at: number): string {
    const d = Date.now() - at
    if (d < 1000) return 'just now'
    if (d < 60_000) return `${Math.round(d / 1000)}s ago`
    return `${Math.round(d / 60_000)}m ago`
  }
</script>

<div class="relative">
  <button
    type="button"
    onclick={() => (open = !open)}
    aria-pressed={open}
    title="reddb activity"
    class={[
      'inline-flex items-center gap-1.5 h-7 px-2 rounded-md border text-xs font-mono transition-colors cursor-pointer',
      activity.inflight > 0
        ? 'border-accent/40 bg-accent/10 text-accent'
        : 'border-line-2 bg-bg-2 text-fg-3 hover:text-fg-1',
    ].join(' ')}
  >
    {#if activity.inflight > 0}
      <Loader2 class="size-3.5 animate-spin" />
      <span>{activity.inflight}</span>
    {:else}
      <Activity class="size-3.5" />
      <span class="text-fg-3">idle</span>
    {/if}
  </button>

  {#if open}
    <div class="fixed inset-0 z-40" role="presentation" onclick={() => (open = false)}></div>
    <div
      role="dialog"
      aria-label="Activity log"
      class="absolute top-[calc(100%+6px)] right-0 z-50 w-[360px] bg-bg-1 border border-line-2 rounded-lg shadow-2xl text-[11px] font-mono"
    >
      <header class="flex items-center justify-between px-3 py-2 border-b border-line-1">
        <span class="type-label">Recent reddb requests</span>
        <div class="flex items-center gap-2">
          <span class="text-fg-3">{activity.inflight} active</span>
          {#if activity.inflight > 0}
            <button
              type="button"
              onclick={() => activity.reset()}
              title="Force-clear the in-flight counter (use when a request hangs)"
              class="px-1.5 py-0.5 rounded border border-line-1 text-fg-3 hover:text-fg-1 hover:border-line-2 cursor-pointer text-[10px]"
            >
              reset
            </button>
          {/if}
        </div>
      </header>
      <div class="max-h-[320px] overflow-y-auto py-1">
        {#if activity.log.length === 0}
          <div class="px-3 py-3 text-fg-3">No activity yet.</div>
        {:else}
          {#each activity.log as e (e.id)}
            <div class="px-3 py-1.5 border-b border-line-1/50 last:border-0 grid grid-cols-[16px_1fr_auto] items-center gap-2">
              <span aria-hidden="true">
                {#if e.status === 'pending'}
                  <Loader2 class="size-3 animate-spin text-accent" />
                {:else if e.status === 'ok'}
                  <CheckCircle2 class="size-3 text-ok" />
                {:else}
                  <AlertCircle class="size-3 text-danger" />
                {/if}
              </span>
              <div class="min-w-0">
                <div class="text-fg-1 truncate">{e.label}</div>
                {#if e.status === 'error' && e.error}
                  <div class="text-danger text-[10px] truncate">{e.error}</div>
                {/if}
              </div>
              <div class="text-fg-3 text-[10px] tabular-nums whitespace-nowrap">
                {#if e.status === 'pending'}
                  {fmtRel(e.startedAt)}
                {:else}
                  {fmtDuration(e.durationMs)}
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>
