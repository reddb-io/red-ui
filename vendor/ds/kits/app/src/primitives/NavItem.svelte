<!--
  NavItem — a Primitive: it imports no other Kit component.

  One entry in a navigation list. Like ListRow it derives its element — an <a>
  when it goes somewhere, a <button> when it only does something — but unlike
  ListRow it also has to say *where you are*: `active` sets `aria-current`, so
  the current page is announced and not merely tinted. Colour alone would leave
  a screen reader with a list of identical links.

  The trailing rail is a snippet, which is how a caller hangs a Badge or a Kbd
  off an item without this component importing either.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { navItem } from "./nav-item.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
    /** The item's text. Ignored when a `children` snippet is given. */
    label?: string;
    /** Where the item goes. Absent, the item is a <button>. */
    href?: string;
    /** Is this the current destination? Defaults to false. */
    active?: boolean;
    /** Unavailable for now: dimmed, and out of the tab order. */
    disabled?: boolean;
    /**
     * What `aria-current` says when the item is active. `page` for a route,
     * `step` inside a wizard, `location` inside a breadcrumb trail.
     */
    current?: "page" | "step" | "location" | "date" | "time" | "true";
    /** Before the label. */
    icon?: Snippet;
    /** After the label, pushed to the end of the item. */
    trailing?: Snippet;
    /** Full control over the label. */
    children?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    label,
    href,
    active = false,
    disabled = false,
    current = "page",
    icon,
    trailing,
    children,
    class: className,
    ...rest
  }: Props = $props();

  const tag = $derived(href !== undefined ? "a" : "button");
  // `pointer-events-none` stops the pointer; only these keep a keyboard out. A
  // disabled link is not a thing the platform has, so its href is withheld —
  // which is exactly what makes it unfocusable.
  const native = $derived(
    tag === "a"
      ? { href: disabled ? undefined : href, tabindex: disabled ? -1 : undefined }
      : { type: "button" as const, disabled },
  );
</script>

<svelte:element
  this={tag}
  {...rest}
  {...native}
  class={navItem({ active, disabled }).root({ class: className })}
  aria-current={active ? current : undefined}
  aria-disabled={disabled ? "true" : undefined}
>
  {#if icon}
    <span class={navItem().icon()} aria-hidden="true">{@render icon()}</span>
  {/if}

  <span class={navItem().label()}>
    {#if children}{@render children()}{:else}{label ?? ""}{/if}
  </span>

  {#if trailing}<span class={navItem().trailing()}>{@render trailing()}</span>{/if}
</svelte:element>
