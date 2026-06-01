<script lang="ts">
  import { pendingChanges, buildUpdateSql } from './pending-changes.svelte'
  import { connection } from './connections.svelte'
  import { X, AlertTriangle, Lock } from 'lucide-svelte'

  // Mutations are committed against the server; block them while it reports
  // read-only (#23). The reason explains *why* the control is disabled.
  const readOnly = $derived(connection.readOnly)
  const readOnlyReason = $derived(connection.readOnlyReason)

  interface Props {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  let committing = $state(false)
  let lastError = $state<string | null>(null)

  async function apply() {
    if (committing) return
    committing = true
    lastError = null
    try {
      const r = await pendingChanges.commitAll()
      if (r.failed.length === 0) {
        onClose()
      }
      // On partial failure the panel stays open so the user can see the
      // failures inline. We don't auto-close.
    } catch (e) {
      lastError = (e as Error).message
    } finally {
      committing = false
    }
  }

  function discard() {
    pendingChanges.discardAll()
    onClose()
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 grid place-items-center bg-bg-0/70 backdrop-blur-sm motion-reduce:backdrop-blur-none"
    role="dialog"
    aria-modal="true"
    aria-label="Pending changes"
  >
    <div class="w-full max-w-2xl mx-4 bg-bg-1 border border-line-1 rounded-md shadow-lg overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-line-1">
        <div>
          <h2 class="type-h3 m-0">Pending changes</h2>
          <p class="text-fg-3 text-[11px] font-mono m-0 mt-0.5">
            {pendingChanges.count} staged · review before applying
          </p>
        </div>
        <button
          type="button"
          class="p-1 text-fg-3 hover:text-fg-1"
          aria-label="Close"
          onclick={onClose}
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="max-h-[50vh] overflow-auto px-4 py-3">
        {#if pendingChanges.count === 0}
          <div class="text-fg-3 text-[12px] font-mono py-6 text-center">
            No staged changes.
          </div>
        {:else}
          <ul class="space-y-2 text-[12px] font-mono">
            {#each pendingChanges.changes as change (change.id)}
              <li class="border border-line-1 rounded px-2 py-1.5 bg-bg-2/30">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="text-fg-2">
                    <span class="text-fg-1">{change.table}</span>
                    <span class="text-fg-3"> · rid </span>
                    <span class="text-fg-1 tabular-nums">{change.row}</span>
                    <span class="text-fg-3"> · </span>
                    <span class="text-fg-1">{change.col}</span>
                  </span>
                  <button
                    type="button"
                    class="text-fg-3 hover:text-fg-1 text-[11px]"
                    onclick={() => pendingChanges.unstage(change.id)}
                  >
                    Unstage
                  </button>
                </div>
                <div class="text-[11px] grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5">
                  <span class="text-fg-3">old</span>
                  <span class="text-fg-2 truncate">{String(change.oldValue ?? 'NULL')}</span>
                  <span class="text-fg-3">new</span>
                  <span class="text-accent truncate">{change.newValue}</span>
                </div>
                <div class="text-fg-3 text-[10.5px] mt-1 truncate">
                  {buildUpdateSql(change)}
                </div>
                {#if change.error}
                  <div class="text-warn text-[11px] mt-1 inline-flex items-center gap-1">
                    <AlertTriangle class="size-3" /> {change.error}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
        {#if lastError}
          <div class="text-warn text-[11px] font-mono mt-2">{lastError}</div>
        {/if}
      </div>

      {#if readOnly}
        <div class="flex items-center gap-1.5 px-4 py-2 text-warn text-[11px] font-mono border-t border-line-1 bg-warn/5">
          <Lock class="size-3 shrink-0" />
          <span>{readOnlyReason ?? 'Server is read-only (file in use) — changes can’t be applied.'}</span>
        </div>
      {/if}

      <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-line-1 bg-bg-1/60">
        <button
          type="button"
          class="text-[12px] font-mono px-3 py-1 text-fg-3 hover:text-fg-1"
          onclick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          class="text-[12px] font-mono px-3 py-1 text-fg-1 border border-line-1 rounded hover:bg-bg-2"
          onclick={discard}
          disabled={pendingChanges.count === 0}
        >
          Discard all
        </button>
        <button
          type="button"
          class="text-[12px] font-mono px-3 py-1 bg-accent text-white rounded disabled:opacity-50"
          onclick={apply}
          disabled={pendingChanges.count === 0 || committing || readOnly}
          title={readOnly ? (readOnlyReason ?? 'Server is read-only — mutations are disabled.') : undefined}
        >
          {committing ? 'Applying…' : 'Apply all'}
        </button>
      </div>
    </div>
  </div>
{/if}
