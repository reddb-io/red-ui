<script lang="ts">
  interface Props {
    title?: string
    floating?: boolean
    class?: string
    children?: import('svelte').Snippet
  }
  let { title, floating = false, class: klass = '', children }: Props = $props()

  const cardClass = $derived(
    floating
      ? 'bg-bg-1/[0.92] border-line-2 shadow-[0_16px_48px_rgba(0,0,0,0.6)]'
      : 'bg-bg-1 border-line-1'
  )
</script>

<section class="rounded-lg border overflow-hidden backdrop-blur-md {cardClass} {klass}">
  {#if title}
    <header class="px-4 h-9 flex items-center font-mono text-[10px] uppercase tracking-[0.1em] text-fg-2 border-b border-line-1 bg-bg-1">
      {title}
    </header>
  {/if}
  <div class="p-4">{@render children?.()}</div>
</section>
