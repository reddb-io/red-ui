<script lang="ts">
  import { PageHeading } from '@reddb-io/design-system/app'
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

{#snippet context()}
  {#if eyebrow}<span class="type-label">{eyebrow}</span>{/if}
  {@render children?.()}
{/snippet}
<PageHeading {title} description={subtitle} {actions} context={eyebrow || children ? context : undefined}
  class="mb-4 border-b border-line-1 pb-4" />
