<!--
  ListRow — a Primitive: it imports no other Kit component.

  The element is derived, never declared: a row with an `href` is a link, a row
  with an `onclick` is a button, and a row with neither is a plain <div>. That
  is the whole behavior, and it is what stops the two failure modes a list of
  rows usually has — a <div> with a click handler that no keyboard can reach,
  and a row wearing hover and focus styling that does nothing at all.

  The leading and trailing rails are snippets so a caller can put a Badge, a
  Kbd or an avatar in them without this component importing any of those and
  becoming a Composite.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { listRow, type ListRowDensity } from "./list-row.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class" | "title"> {
    /** The row's primary line. Ignored when a `children` snippet is given. */
    title?: string;
    /** The secondary line under the title. */
    description?: string;
    /** Renders the row as a link to here. */
    href?: string;
    /** Row height and inset. Defaults to `comfortable`. */
    density?: ListRowDensity;
    /** Mark the row as the one the list is currently about. */
    selected?: boolean;
    /** Before the text: an icon, an avatar, a status dot. */
    leading?: Snippet;
    /** After the text, pushed to the end of the row. */
    trailing?: Snippet;
    /** Full control over the text block. Replaces `title`/`description`. */
    children?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    title,
    description,
    href,
    density = "comfortable",
    selected = false,
    leading,
    trailing,
    children,
    class: className,
    ...rest
  }: Props = $props();

  const tag = $derived(href !== undefined ? "a" : rest.onclick ? "button" : "div");
  const interactive = $derived(tag !== "div");
  // A link needs its destination; a button must not submit the form it happens
  // to stand in, exactly as Button defaults. A <div> needs neither.
  const native = $derived(
    tag === "a" ? { href } : tag === "button" ? { type: "button" as const } : {},
  );

  const slots = $derived(listRow({ density, interactive, selected }));
</script>

<svelte:element
  this={tag}
  {...rest}
  {...native}
  class={slots.root({ class: className })}
  aria-current={selected && tag === "a" ? "true" : undefined}
>
  {#if leading}<span class={slots.leading()}>{@render leading()}</span>{/if}

  <span class={slots.text()}>
    {#if children}
      {@render children()}
    {:else}
      {#if title}<span class={slots.title()}>{title}</span>{/if}
      {#if description}<span class={slots.description()}>{description}</span>{/if}
    {/if}
  </span>

  {#if trailing}<span class={slots.trailing()}>{@render trailing()}</span>{/if}
</svelte:element>
