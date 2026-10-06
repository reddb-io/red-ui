<script module lang="ts">
  export interface PaginationPage {
    page: number;
    href: string;
    current?: boolean;
  }
</script>

<script lang="ts">
  import Link from "./Link.svelte";
  import { pagination } from "./pagination.variants";

  interface Props {
    /**
     * The page links in display order; each carries its page number and `href`, and `current`
     * marks the page being viewed.
     */
    pages: readonly PaginationPage[];
    /** Accessible name of the navigation landmark; defaults to `Pagination`. */
    label?: string;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  let { pages, label = "Pagination", class: className }: Props = $props();
  const styles = pagination();
</script>

<nav aria-label={label} data-pagination class={styles.root({ class: className })}>
  <ul class={styles.list()}>
    {#each pages as item (item.page)}
      <li>
        <Link
          href={item.href}
          aria-label={item.current ? `Page ${item.page}, current page` : `Go to page ${item.page}`}
          aria-current={item.current ? "page" : undefined}
          class={styles.page()}
        >{item.page}</Link>
      </li>
    {/each}
  </ul>
</nav>
