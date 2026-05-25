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

<section class="rounded-[10px] border overflow-hidden backdrop-blur-md {cardClass} {klass}">
  {#if title}
    <header class="px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-[0.08em] text-fg-2 border-b border-line-1">
      {title}
    </header>
  {/if}
  <div class="p-3.5">{@render children?.()}</div>
</section>
