<!--
  Badge — a Primitive: it imports no other Kit component.

  A status marker, not a control: it renders a <span>, takes no click handler
  of its own, and passes every other span attribute through. A badge that
  needs to be pressed is a Button wearing badge classes, which is exactly what
  exporting `badge` from the variants module is for.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { badge, type BadgeVariant } from "./badge.variants";

  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    /** Emphasis. Defaults to `neutral`. */
    variant?: BadgeVariant;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    children?: Snippet;
  }

  const { variant = "neutral", class: className, children, ...rest }: Props = $props();
</script>

<span {...rest} class={badge({ variant, class: className })}>
  {@render children?.()}
</span>
