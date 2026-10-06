<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { Icon } from "@reddb-io/design-system/base";
  import NavItem from "../primitives/NavItem.svelte";
  import { bottomNavigation } from "./bottom-navigation.variants";
  import { navigationItems, type ApplicationNavigationItem } from "./navigation.behavior";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
    /** Accessible name for the `nav` landmark. */
    label: string;
    /** Destinations, one link per entry in the given order; each `id` must be unique. */
    items: readonly ApplicationNavigationItem[];
    /**
     * The `id` of the item for the current page. It must match exactly one entry in `items`, or the
     * component throws.
     */
    currentId: string;
    /** Extra classes, merged over the root slot's own, onto the `nav` element. */
    class?: string;
  }

  const { label, items, currentId, class: className, ...rest }: Props = $props();
  const resolvedItems = $derived(navigationItems(items, currentId));
  const styles = $derived(bottomNavigation());
</script>

<nav
  {...rest}
  aria-label={label}
  data-bottom-navigation
  class={styles.root({ class: className })}
>
  <ul class={styles.list()}>
    {#each resolvedItems as item (item.id)}
      <li class={styles.entry()}>
        {#snippet glyph()}
          {#if item.icon}
            <Icon
              icon={item.icon}
              size="md"
              color={item.current ? "foreground" : "ink-muted"}
              aria-hidden="true"
            />
          {/if}
        {/snippet}
        <NavItem
          label={item.label}
          href={item.href}
          current={item.current}
          disabled={item.disabled}
          data-navigation-item={item.id}
          class={styles.item()}
          onclick={item.onselect}
          icon={item.icon ? glyph : undefined}
        />
      </li>
    {/each}
  </ul>
</nav>
