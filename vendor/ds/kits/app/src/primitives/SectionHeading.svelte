<!--
  SectionHeading — a Primitive: it imports no other Kit component.

  The `level` prop is the whole point of the component: the visual weight of a
  heading and its place in the document outline are separate decisions, and a
  Kit that fuses them forces a page to choose between looking right and being
  navigable. `size` sets the look, `level` sets the element, and neither
  implies the other.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    sectionHeading,
    type SectionHeadingLevel,
    type SectionHeadingSize,
  } from "./section-heading.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class" | "title"> {
    /** The heading text. */
    title: string;
    /** Supporting line under the title. */
    description?: string;
    /** Outline depth: renders <h2>…<h6>. Defaults to 2. */
    level?: SectionHeadingLevel;
    /** Visual weight, independent of `level`. Defaults to `md`. */
    size?: SectionHeadingSize;
    /** Draw the hairline under the heading. Defaults to true. */
    rule?: boolean;
    /** Controls that belong to the section, rendered opposite the title. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    title,
    description,
    level = 2,
    size = "md",
    rule = true,
    actions,
    class: className,
    ...rest
  }: Props = $props();

  const slots = $derived(sectionHeading({ size, rule }));
</script>

<div {...rest} class={slots.root({ class: className })}>
  <div class={slots.text()}>
    <svelte:element this={`h${level}`} class={slots.title()}>{title}</svelte:element>
    {#if description}<p class={slots.description()}>{description}</p>{/if}
  </div>
  {#if actions}
    <div class={slots.actions()}>{@render actions()}</div>
  {/if}
</div>
