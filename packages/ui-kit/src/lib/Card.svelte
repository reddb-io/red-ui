<script lang="ts">
  interface Props {
    title?: string
    floating?: boolean
    children?: import('svelte').Snippet
  }
  let { title, floating = false, children }: Props = $props()
</script>

<section class="card" class:floating>
  {#if title}<header>{title}</header>{/if}
  <div class="body">{@render children?.()}</div>
</section>

<style>
  .card {
    background: var(--bg-1);
    border: 1px solid var(--line-1);
    border-radius: var(--r-lg);
    overflow: hidden;
    backdrop-filter: blur(8px);
  }
  .floating {
    background: color-mix(in srgb, var(--bg-1) 92%, transparent);
    border-color: var(--line-2);
    box-shadow: var(--shadow-lg);
  }
  header {
    padding: 10px 14px;
    font-size: 10px;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg-2);
    border-bottom: 1px solid var(--line-1);
  }
  .body { padding: 14px; }
</style>
