<!--
  Pill — a Primitive: it imports no other Kit component.

  Optionally dismissible. The dismiss affordance is a plain <button> rather
  than the Kit's Button: reaching for Button here would make Pill a Composite
  and drag a whole control's variants into a 20px target that only ever needs
  to inherit the Pill's own colour. The mechanical Primitive test is what keeps
  that decision honest rather than aesthetic.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { pill, pillDismiss, type PillSize, type PillVariant } from "./pill.variants";

  interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    /** Emphasis. Defaults to `neutral`. */
    variant?: PillVariant;
    /** Defaults to `md`. */
    size?: PillSize;
    /**
     * When given, the Pill renders a dismiss affordance and calls this. Absent,
     * it renders none — a Pill nobody can remove should not pretend otherwise.
     */
    onDismiss?: () => void;
    /** Accessible name for the dismiss affordance. */
    dismissLabel?: string;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    children?: Snippet;
  }

  const {
    variant = "neutral",
    size = "md",
    onDismiss,
    dismissLabel = "Remove",
    class: className,
    children,
    ...rest
  }: Props = $props();
</script>

<span {...rest} class={pill({ variant, size, class: className })}>
  {@render children?.()}
  {#if onDismiss}
    <button type="button" class={pillDismiss()} aria-label={dismissLabel} onclick={onDismiss}>
      <!-- A glyph, not an icon dependency: the Kit ships no icon set yet, and
           inventing one inside a Primitive would be a second decision hiding
           inside this slice. -->
      <span aria-hidden="true">&times;</span>
    </button>
  {/if}
</span>
