<script lang="ts">
  interface Props { children?: import('svelte').Snippet }
  let { children }: Props = $props()
</script>

<kbd class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 font-mono text-[10px] text-fg-1 bg-bg-2 border border-line-2 border-b-2 rounded-sm">
  {@render children?.()}
</kbd>
