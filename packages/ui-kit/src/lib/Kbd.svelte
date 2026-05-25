<script lang="ts">
  interface Props { children?: import('svelte').Snippet }
  let { children }: Props = $props()
</script>

<kbd>{@render children?.()}</kbd>

<style>
  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--fg-1);
    background: var(--bg-2);
    border: 1px solid var(--line-2);
    border-bottom-width: 2px;
    border-radius: var(--r-sm);
  }
</style>
