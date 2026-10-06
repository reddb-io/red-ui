<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import List from "./List.svelte";
  import { gridList, type GridListColumn } from "./grid-list.variants";
  import type { ListGap } from "./list.variants";

  interface Props extends Omit<HTMLAttributes<HTMLUListElement>, "class"> {
    /**
     * Most columns the list may use, `1` to `4` (default `1`); it uses fewer as its own width
     * narrows.
     */
    columns?: GridListColumn;
    /** Density-owned space between items: `sm`, `md` (the default) or `lg`. */
    gap?: ListGap;
    /** Extra classes merged onto the list element. */
    class?: string;
    /** The list items, usually `li` elements. */
    children?: Snippet;
  }

  let {
    columns = 1,
    gap = "md",
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<List {...rest} data-grid-list {gap} class={gridList({ columns, class: className })}>
  {@render children?.()}
</List>
