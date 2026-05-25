<script lang="ts">
  interface Props {
    title: string
    /** mono uppercase eyebrow above the title — e.g. "Explore", "Admin" */
    eyebrow?: string
    /** subtle subtitle/description below — single line, fg-2 */
    subtitle?: string
    actions?: import('svelte').Snippet
    children?: import('svelte').Snippet
  }
  let { title, eyebrow, subtitle, actions, children }: Props = $props()
</script>

<header class="flex items-end justify-between gap-4 pb-4 mb-4 border-b border-line-1">
  <div class="min-w-0">
    {#if eyebrow}
      <div class="type-label mb-1.5">{eyebrow}</div>
    {/if}
    <div class="flex items-baseline gap-3 flex-wrap">
      <h1 class="type-h1 m-0">{title}</h1>
      {@render children?.()}
    </div>
    {#if subtitle}
      <p class="type-caption m-0 mt-1.5">{subtitle}</p>
    {/if}
  </div>
  {#if actions}
    <div class="flex items-center gap-2 shrink-0">
      {@render actions()}
    </div>
  {/if}
</header>
