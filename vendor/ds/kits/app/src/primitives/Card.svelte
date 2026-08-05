<!--
  Card — a Primitive: it imports no other Kit component.

  Header and footer are optional and, when absent, are not rendered at all —
  an empty header would still draw its rule and its padding, which is a visible
  lie about the Card's contents. `title`/`description` are the common case
  spelled as strings; the `header` snippet is the escape hatch for anything
  richer, and wins when both are given.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { card, type CardPadding, type CardVariant } from "./card.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** Edge treatment. Defaults to `outline`. */
    variant?: CardVariant;
    /** Inset applied to every section. Defaults to `md`. */
    padding?: CardPadding;
    /** Header title, rendered when no `header` snippet is given. */
    title?: string;
    /** Supporting line under the title. */
    description?: string;
    /** Full control over the header. Replaces `title`/`description`. */
    header?: Snippet;
    /** Rendered below the body, above its own rule. */
    footer?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
    children?: Snippet;
  }

  const {
    variant = "outline",
    padding = "md",
    title,
    description,
    header,
    footer,
    class: className,
    children,
    ...rest
  }: Props = $props();

  const slots = $derived(card({ variant, padding }));
  const hasHeader = $derived(Boolean(header ?? title ?? description));
</script>

<div {...rest} class={slots.root({ class: className })}>
  {#if hasHeader}
    <div class={slots.header()}>
      {#if header}
        {@render header()}
      {:else}
        {#if title}<p class={slots.title()}>{title}</p>{/if}
        {#if description}<p class={slots.description()}>{description}</p>{/if}
      {/if}
    </div>
  {/if}

  <div class={slots.body()}>
    {@render children?.()}
  </div>

  {#if footer}
    <div class={slots.footer()}>{@render footer()}</div>
  {/if}
</div>
