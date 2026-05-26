<script lang="ts">
  import { goto } from '$app/navigation'
  import { connection } from './connections.svelte'
  import { pendingChanges } from './pending-changes.svelte'
  import { ArrowRight, FilePenLine } from 'lucide-svelte'

  const pendingCount = $derived(pendingChanges.count)

  function openPending() {
    window.dispatchEvent(new CustomEvent('red:open-pending-changes'))
  }

  const connected = $derived(connection.connected)
  const role = $derived<'primary' | 'replica' | 'standalone' | 'embedded'>(
    (connection.probe.replication?.role as 'primary' | 'replica' | 'standalone' | undefined)
      ?? (connection.active?.role as 'primary' | 'replica' | 'embedded' | undefined)
      ?? 'standalone'
  )

  const roleDotColor = $derived(
    role === 'primary'  ? 'var(--color-role-primary)' :
    role === 'replica'  ? 'var(--color-role-replica)' :
    role === 'embedded' ? 'var(--color-role-embedded)' :
                          'var(--color-fg-3)'
  )

  const wal = $derived(
    connection.probe.replication?.wal_lsn
      ?? connection.probe.replication?.last_applied_lsn
  )

  const lag = $derived.by(() => {
    const r = connection.probe.replication
    if (!r || role !== 'replica') return undefined
    if (r.last_seen_primary_lsn === undefined || r.last_applied_lsn === undefined) return undefined
    return Math.max(0, r.last_seen_primary_lsn - r.last_applied_lsn)
  })

  function openConnect() {
    window.dispatchEvent(new CustomEvent('red:open-connect'))
  }

  function openCluster(e: MouseEvent) {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, [data-no-nav]')) return
    goto('/cluster')
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      goto('/cluster')
    }
  }
</script>

<div
  class="h-8 flex items-stretch border-b border-line-1 bg-bg-1/60 text-[11px] font-mono select-none"
  role="status"
  aria-label="Connection status"
>
  <div
    role="button"
    tabindex="0"
    onclick={openCluster}
    onkeydown={onKey}
    title="Open cluster overview"
    class="flex-1 flex items-center gap-3 px-3 cursor-pointer hover:bg-bg-2/40 transition-colors min-w-0"
  >
    {#if connected}
      <span class="inline-flex items-center gap-1.5 shrink-0">
        <span
          class="w-1.5 h-1.5 rounded-full"
          style:background-color={roleDotColor}
        ></span>
        <span class="text-fg-1 uppercase tracking-wider text-[10px]">{role}</span>
      </span>

      <span class="text-fg-3">·</span>
      <span class="text-fg-1 truncate">{connection.active.label}</span>

      {#if connection.probe.rtt_ms !== undefined}
        <span class="text-fg-3">·</span>
        <span class="text-fg-2">
          <span class="text-fg-3">rtt</span>
          <span class="text-fg-1 tabular-nums">{connection.probe.rtt_ms}</span><span class="text-fg-3">ms</span>
        </span>
      {/if}

      {#if role === 'replica' && lag !== undefined}
        <span class="text-fg-3">·</span>
        <span class="text-fg-2">
          <span class="text-fg-3">lag</span>
          <span class:text-warn={(lag ?? 0) > 0} class="text-fg-1 tabular-nums">{lag}</span>
        </span>
      {/if}

      {#if wal !== undefined}
        <span class="text-fg-3">·</span>
        <span class="text-fg-2">
          <span class="text-fg-3">lsn</span>
          <span class="text-fg-1 tabular-nums">{wal}</span>
        </span>
      {/if}
    {:else}
      <span class="inline-flex items-center gap-1.5 shrink-0">
        <span class="w-1.5 h-1.5 rounded-full bg-fg-3"></span>
        <span class="text-fg-3">Not connected</span>
      </span>
    {/if}
  </div>

  {#if pendingCount > 0}
    <button
      type="button"
      onclick={openPending}
      data-no-nav
      aria-label={`${pendingCount} pending changes`}
      class="inline-flex items-center gap-1.5 px-3 text-accent hover:bg-bg-2/60 transition-colors cursor-pointer bg-transparent border-0 border-l border-line-1"
    >
      <FilePenLine class="size-3" />
      <span class="tabular-nums">Pending changes ({pendingCount})</span>
    </button>
  {/if}

  {#if !connected}
    <button
      type="button"
      onclick={openConnect}
      data-no-nav
      class="inline-flex items-center gap-1 px-3 text-fg-2 hover:text-fg-0 hover:bg-bg-2/60 transition-colors cursor-pointer bg-transparent border-0 border-l border-line-1"
    >
      <span>Connect</span>
      <ArrowRight class="size-3" />
    </button>
  {/if}
</div>
