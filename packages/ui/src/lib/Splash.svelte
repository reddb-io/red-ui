<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    onDone?: () => void
  }
  let { onDone }: Props = $props()

  let visible = $state(true)
  let stage = $state(0) // 0: pre, 1: in, 2: out

  onMount(() => {
    const inT = setTimeout(() => (stage = 1), 20)
    const outT = setTimeout(() => (stage = 2), 800)
    const closeT = setTimeout(() => {
      visible = false
      onDone?.()
    }, 1000)
    return () => {
      clearTimeout(inT)
      clearTimeout(outT)
      clearTimeout(closeT)
    }
  })
</script>

{#if visible}
  <div
    class="fixed inset-0 z-[9999] grid place-items-center bg-bg-0 transition-opacity duration-200 ease-out"
    class:opacity-0={stage === 2}
    class:opacity-100={stage === 1}
    class:pointer-events-none={stage === 2}
    style:opacity={stage === 0 ? 0 : undefined}
  >
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full bg-accent shadow-[0_0_12px_var(--color-accent-glow)]"></div>
      <span class="font-mono font-semibold text-fg-0 text-[15px] tracking-tight">red<span class="text-accent mx-px">·</span>ui</span>
    </div>
  </div>
{/if}

<style>
  @media (prefers-reduced-motion: reduce) {
    div { transition: none !important; }
  }
</style>
