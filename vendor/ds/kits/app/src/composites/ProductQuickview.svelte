<!-- Product detail inside the canonical Dialog focus and dismissal lifecycle. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { Dialog } from "@reddb-io/design-system/base";
  import { productQuickview } from "./product-quickview.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "class" | "title"> {
    /**
     * Accessible name for the Button that opens the dialog, and its visible text when no `trigger`
     * is given.
     */
    triggerLabel: string;
    /** Visible dialog title and the dialog's accessible name. */
    title: string;
    /** Supporting line under the title, associated with the dialog as its description. */
    description?: string;
    /** Custom content for the opening Button; `triggerLabel` stays its accessible name. */
    trigger?: Snippet;
    /** Caller-owned product imagery, including its own alternative text. */
    media?: Snippet;
    /** Caller-owned product detail and controls. */
    children?: Snippet;
    /** Controls for the dialog's action region; it receives `{ close }` to dismiss the dialog. */
    actions?: Snippet<[{ close: () => void }]>;
    /** Extra classes, merged over the root slot's own, onto the wrapper around the dialog. */
    class?: string;
    /** Extra classes, merged over the dialog slot's own, onto the modal surface. */
    dialogClass?: string;
  }

  const {
    triggerLabel,
    title,
    description,
    trigger,
    media,
    children,
    actions,
    class: className,
    dialogClass,
    ...rest
  }: Props = $props();
  const slots = $derived(productQuickview());
</script>

<div
  {...(rest as Record<string, unknown>)}
  data-product-quickview
  class={slots.root({ class: className })}
>
  <Dialog
    {triggerLabel}
    {title}
    {description}
    {trigger}
    {actions}
    initialFocus="body"
    class={slots.dialog({ class: dialogClass })}
  >
    <div data-product-quickview-content class={slots.content()}>
      {#if media}
        <div data-product-quickview-media class={slots.media()}>{@render media()}</div>
      {/if}
      <div data-product-quickview-body class={slots.body()}>{@render children?.()}</div>
    </div>
  </Dialog>
</div>
