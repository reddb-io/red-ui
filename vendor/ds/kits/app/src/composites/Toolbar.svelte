<script lang="ts">
  import { Toolbar as Bits } from "bits-ui";
  import { Button, Link } from "@reddb-io/design-system/base";
  import type { ToolbarItem } from "./command-surfaces.behavior";
  import { toolbar, type ToolbarSize } from "./toolbar.variants";

  type Orientation = "horizontal" | "vertical";

  interface Props {
    /** Accessible name for the toolbar. */
    label: string;
    /**
     * Actions and destinations in order; an enabled item with an `href` renders as a link, any
     * other as a button that calls its `onselect`.
     */
    items?: readonly ToolbarItem[];
    /**
     * Layout direction and the arrow-key axis: `horizontal` or `vertical`. Defaults to
     * `horizontal`.
     */
    orientation?: Orientation;
    /** Size of the item controls: `sm`, `md` or `lg`. Defaults to `md`. */
    size?: ToolbarSize;
    /**
     * Whether arrow-key focus wraps from the last item back to the first, and the reverse. Defaults
     * to `true`.
     */
    loop?: boolean;
    /** Extra classes, merged over the root slot's own, onto the toolbar element. */
    class?: string;
  }

  let {
    label,
    items = [],
    orientation = "horizontal",
    size = "md",
    loop = true,
    class: className,
  }: Props = $props();

  const slots = $derived(toolbar({ orientation, size }));
</script>

<Bits.Root {orientation} {loop}>
  {#snippet child({ props })}
    <div
      {...props}
      data-command-toolbar
      aria-label={label}
      aria-orientation={orientation}
      class={slots.root({ class: className })}
    >
      {#each items as item (item.id)}
        {@const href = item.href}
        {#if href !== undefined && !item.disabled}
          <Bits.Link>
            {#snippet child({ props: linkProps })}
              <Link
                {...linkProps}
                data-toolbar-item
                {href}
                class={slots.item()}
              >{item.label}</Link>
            {/snippet}
          </Bits.Link>
        {:else}
          <Bits.Button disabled={item.disabled}>
            {#snippet child({ props: buttonProps })}
              <Button
                {...buttonProps}
                data-toolbar-item
                disabled={item.disabled}
                variant="ghost"
                {size}
                class={slots.item()}
                onclick={() => item.onselect?.()}
              >{item.label}</Button>
            {/snippet}
          </Bits.Button>
        {/if}
      {/each}
    </div>
  {/snippet}
</Bits.Root>
