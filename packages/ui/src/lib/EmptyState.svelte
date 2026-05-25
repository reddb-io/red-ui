<script lang="ts">
  interface Props {
    title: string
    message?: string
    /** lucide-svelte icon component */
    icon?: any
    hint?: string
    actions?: import('svelte').Snippet
  }
  let { title, message, icon: Icon, hint, actions }: Props = $props()
</script>

<div class="flex flex-col items-center justify-center text-center py-16 px-6 min-h-[280px] bg-bg-1 border border-line-1 border-dashed rounded-lg">
  {#if Icon}
    <Icon class="size-9 text-fg-3 mb-4" strokeWidth={1.4} />
  {/if}
  <h2 class="type-h2 m-0 mb-2">{title}</h2>
  {#if message}
    <p class="text-fg-2 text-[13px] m-0 max-w-md leading-relaxed">{message}</p>
  {/if}
  {#if hint}
    <code class="font-mono text-[11px] text-fg-3 mt-3 px-2 py-1 bg-bg-2 border border-line-1 rounded">{hint}</code>
  {/if}
  {#if actions}
    <div class="flex items-center gap-2 mt-5">{@render actions()}</div>
  {/if}
</div>
