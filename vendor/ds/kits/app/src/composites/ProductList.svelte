<!-- A named product collection composed from canonical GridList and Card surfaces. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { Card, GridList, Heading, type GridListColumn } from "@reddb-io/design-system/base";
  import type { ProductListItem } from "./product-list.behavior";
  import { productList } from "./product-list.variants";

  interface Props extends Omit<HTMLAttributes<HTMLUListElement>, "children" | "class"> {
    /** Required accessible name for the product collection. */
    label: string;
    /** Product content remains consumer-owned and is rendered in the given order. */
    items: readonly ProductListItem[];
    /** Number of grid columns for the products: `1`, `2`, `3` or `4`. Defaults to `2`. */
    columns?: GridListColumn;
    /** Caller-owned empty state, rendered as the collection's only item. */
    empty?: Snippet;
    /** Extra classes, merged over the root slot's own, onto the GridList. */
    class?: string;
  }

  const instanceId = $props.id();
  const {
    label,
    items,
    columns = 2,
    empty,
    class: className,
    ...rest
  }: Props = $props();
  const slots = $derived(productList({ columns }));
</script>

<GridList
  {...(rest as Record<string, unknown>)}
  data-product-list
  aria-label={label}
  {columns}
  gap="md"
  class={slots.root({ class: className })}
>
  {#each items as item, index (item.id)}
    {@const titleId = `${instanceId}-product-${index}-name`}
    <li class={slots.item()}>
      <Card
        data-product-list-item
        role="article"
        aria-labelledby={titleId}
        padding="sm"
        footer={item.actions}
        class={slots.card()}
      >
        {#snippet header()}
          <div class={slots.identity()}>
            <Heading level={3} role="heading" id={titleId} data-product-list-name class={slots.name()}>
              {#if item.href}<a href={item.href}>{item.name}</a>{:else}{item.name}{/if}
            </Heading>
            {#if item.price}<p data-product-list-price class={slots.price()}>{item.price}</p>{/if}
          </div>
        {/snippet}

        {#if item.media}
          <div data-product-list-media class={slots.media()}>{@render item.media()}</div>
        {/if}
        {#if item.description}
          <p data-product-list-description class={slots.description()}>{item.description}</p>
        {/if}

      </Card>
    </li>
  {:else}
    <li data-product-list-empty class={slots.empty()}>
      {#if empty}{@render empty()}{:else}No products available.{/if}
    </li>
  {/each}
</GridList>
