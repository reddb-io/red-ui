<script lang="ts">
  // A section title row: optional leading icon + title + optional trailing meta
  // (typically a `Pill` count). Density-first — sits above a stack of ListRows.
  import type { Snippet } from 'svelte'

  interface Props {
    title: string
    /** Leading icon (e.g. a lucide component rendered in a snippet). */
    icon?: Snippet
    /** Trailing meta — usually a `Pill` with a count. */
    meta?: Snippet
    class?: string
  }
  let { title, icon, meta, class: klass = '' }: Props = $props()
</script>

<div class="flex items-center gap-2 {klass}">
  {#if icon}
    <span class="flex size-4 shrink-0 items-center justify-center text-fg-2">{@render icon()}</span>
  {/if}
  <h2 class="text-[11px] font-mono uppercase tracking-[0.1em] text-fg-2">{title}</h2>
  {#if meta}
    <span class="ml-0.5">{@render meta()}</span>
  {/if}
</div>
