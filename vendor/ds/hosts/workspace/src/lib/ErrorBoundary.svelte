<script lang="ts">
  import { CodeBlock } from "@reddb-io/design-system/base"
  // Black-screen shield (#126). A render crash inside the Workspace used to
  // tear down the whole webview and leave a black window with no way back.
  // This wraps its children in a Svelte error boundary whose `failed` state
  // keeps diagnostics in a disclosure alongside two recovery actions:
  //   - Retry render: re-runs the boundary's children (`reset`). Recovers when
  //     the fault was transient — the offending state has since changed.
  //   - Reload window: hard-reloads the document. Always works, even when the
  //     fault reproduces on every render.
  // Artwork and controls inherit the surrounding DS appearance.
  import type { Snippet } from 'svelte'
  import { ErrorBoundary as Boundary } from '@reddb-io/design-system/app'
  import { Button, Disclosure, Icon, StateIllustration } from '@reddb-io/design-system/base'
  import { maintenance } from '@reddb-io/design-system/base/illustrations'
  import RotateCw from '@lucide/svelte/icons/rotate-cw'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'

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

<Boundary title="Something crashed while rendering" class="h-full w-full">
  {@render children()}

  {#snippet fallback({ error, retry })}
    <div
      class="relative z-[1] flex h-full w-full flex-col items-center justify-center gap-5 overflow-auto bg-background px-6 py-10 text-center"
    >
      <div class="flex flex-col items-center gap-2">
        <StateIllustration art={maintenance} size="lg" />
        <h1 class="type-h2 m-0 text-foreground">Something crashed while rendering</h1>
        <p class="m-0 max-w-lg text-[13px] leading-relaxed text-ink-muted">
          The workspace could not be displayed. Try rendering it again, or
          reload the window to continue.
        </p>
      </div>

      <Disclosure label="Error details" class="w-full max-w-2xl text-left">
        <p class="my-3 max-w-full break-words font-mono text-[12px] text-primary-text">
          {messageOf(error)}
        </p>

        {#if stackOf(error)}
          <CodeBlock code={stackOf(error) ?? ""} />
        {/if}
      </Disclosure>

      <div class="flex flex-wrap justify-center gap-2">
        <Button
          variant="primary"
          onclick={retry}
        >
          <Icon icon={RotateCw} size="sm" />
          Retry render
        </Button>
        <Button
          onclick={reloadWindow}
        >
          <Icon icon={RefreshCw} size="sm" />
          Reload window
        </Button>
      </div>
    </div>
  {/snippet}
</Boundary>
