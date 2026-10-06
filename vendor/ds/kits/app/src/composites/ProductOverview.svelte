<!-- Product identity and caller-owned purchase content in one reusable overview. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    SectionHeading,
    Stack,
    type SectionHeadingLevel,
  } from "@reddb-io/design-system/base";
  import { productOverview } from "./product-overview.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "children" | "class" | "title"> {
    /** Heading text for the product; it is also the section's accessible name. */
    title: string;
    /** Supporting line under the title. Nothing is rendered when omitted. */
    description?: string;
    /** Caller-formatted price, shown under the heading. Nothing is rendered when omitted. */
    price?: string;
    /** Outline depth of the heading, `1` to `6`. Defaults to `2`. */
    level?: SectionHeadingLevel;
    /** Caller-owned product imagery, including its own alternative text. */
    media: Snippet;
    /** Caller-owned product detail, options, or fulfilment information. */
    children?: Snippet;
    /** Caller-owned canonical purchase controls. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own, onto the `section` element. */
    class?: string;
  }

  const instanceId = $props.id();
  const headingId = `${instanceId}-title`;
  const {
    title,
    description,
    price,
    level = 2,
    media,
    children,
    actions,
    class: className,
    ...rest
  }: Props = $props();
  const slots = $derived(productOverview());
</script>

<section
  {...(rest as Record<string, unknown>)}
  data-product-overview
  aria-labelledby={headingId}
  class={slots.root({ class: className })}
>
  <div data-product-overview-media class={slots.media()}>{@render media()}</div>
  <Stack gap="layout-sm" class={slots.content()}>
    <SectionHeading
      {title}
      {description}
      {level}
      titleId={headingId}
      rule={false}
      class={slots.heading()}
    />
    {#if price}<p data-product-overview-price class={slots.price()}>{price}</p>{/if}
    {#if children}
      <div data-product-overview-body class={slots.body()}>{@render children()}</div>
    {/if}
    {#if actions}
      <div data-product-overview-actions class={slots.actions()}>{@render actions()}</div>
    {/if}
  </Stack>
</section>
