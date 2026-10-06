<!-- A compact card title over the canonical section-heading outline contract. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    SectionHeading,
    type SectionHeadingLevel,
    type SectionHeadingSize,
  } from "@reddb-io/design-system/base";
  import { cardHeading } from "./card-heading.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** Heading text, rendered as a heading element at `level`. */
    title: string;
    /** Supporting line under the title. Nothing is rendered when omitted. */
    description?: string;
    /**
     * Outline depth of the heading, `1` to `6`, independent of its visual `size`. Defaults to `2`.
     */
    level?: SectionHeadingLevel;
    /** Visual size of the title: `sm`, `md`, `lg` or `display`. Defaults to `sm`. */
    size?: SectionHeadingSize;
    /**
     * Controls rendered at the end of the heading row; they wrap below the title when the row is
     * narrow.
     */
    actions?: Snippet;
    /** Extra classes, merged over the heading's own, onto the root element. */
    class?: string;
  }

  const {
    title,
    description,
    level = 2,
    size = "sm",
    actions,
    class: className,
    ...rest
  }: Props = $props();
</script>

<SectionHeading
  {...(rest as Record<string, unknown>)}
  data-card-heading
  {title}
  {description}
  {level}
  {size}
  rule={false}
  {actions}
  class={cardHeading({ class: className })}
/>
