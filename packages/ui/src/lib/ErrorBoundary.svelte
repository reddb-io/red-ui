<script lang="ts">
  // Black-screen shield (#126). A render crash inside the Workspace used to
  // tear down the whole webview and leave a black window with no way back.
  // This wraps its children in a Svelte error boundary whose `failed` state
  // shows the message, the stack, and two recovery actions:
  //   - Retry render: re-runs the boundary's children (`reset`). Recovers when
  //     the fault was transient — the offending state has since changed.
  //   - Reload window: hard-reloads the document. Always works, even when the
  //     fault reproduces on every render.
  // Styling stays on the dark tokens and keeps a single accent (the primary
  // Retry action), per the one-accent discipline.
  import type { Snippet } from 'svelte'
  import { RotateCw, RefreshCw } from 'lucide-svelte'

  let { children }: { children: Snippet } = $props()

  function reloadWindow() {
    if (typeof window !== 'undefined') window.location.reload()
  }

  function messageOf(error: unknown): string {
    if (error instanceof Error) return error.message || error.name
    return String(error)
  }

  function stackOf(error: unknown): string | null {
    return error instanceof Error && error.stack ? error.stack : null
  }
</script>

<svelte:boundary>
  {@render children()}

  {#snippet failed(error, reset)}
    <div
      role="alert"
      class="flex h-full w-full flex-col items-center justify-center gap-5 overflow-auto bg-bg-0 px-6 py-10 text-center"
    >
      <div class="flex flex-col items-center gap-2">
        <RotateCw class="size-8 text-fg-3" strokeWidth={1.4} />
        <h1 class="type-h2 m-0 text-fg-0">Something crashed while rendering</h1>
        <p class="m-0 max-w-lg text-[13px] leading-relaxed text-fg-2">
          The workspace hit an unexpected error. Your connection is untouched —
          retry the render, or reload the window to start clean.
        </p>
      </div>

      <p class="m-0 max-w-lg break-words font-mono text-[12px] text-accent">
        {messageOf(error)}
      </p>

      {#if stackOf(error)}
        <pre
          class="m-0 max-h-52 w-full max-w-2xl overflow-auto rounded-lg border border-line-1 bg-bg-1 p-3 text-left font-mono text-[11px] leading-relaxed text-fg-3"
        >{stackOf(error)}</pre>
      {/if}

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={reset}
          class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[12px] font-medium text-white hover:bg-accent/90"
        >
          <RotateCw class="size-3.5" strokeWidth={2} />
          Retry render
        </button>
        <button
          type="button"
          onclick={reloadWindow}
          class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-1 bg-bg-1 px-3 text-[12px] font-medium text-fg-1 hover:bg-bg-2"
        >
          <RefreshCw class="size-3.5" strokeWidth={2} />
          Reload window
        </button>
      </div>
    </div>
  {/snippet}
</svelte:boundary>
