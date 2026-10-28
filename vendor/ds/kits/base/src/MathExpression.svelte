<!-- Frames accessible math rendered by a consumer's chosen engine. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { mathExpression } from "./math-expression.variants";

  interface Props {
    /** Inline in a sentence, or a centered display equation. */
    display?: "inline" | "block";
    /** Accessible MathML or other safely rendered mathematical content. */
    children?: Snippet;
    /** Accessible name of a scrollable display equation. */
    label?: string;
    /** Extra classes merged onto the root. */
    class?: string;
  }
  const { display = "inline", children, label = "Mathematical expression", class: className }: Props = $props();
</script>

<svelte:element this={display === "block" ? "div" : "span"} data-math-expression
  role={display === "block" ? "region" : undefined}
  aria-label={display === "block" ? label : undefined}
  tabindex={display === "block" ? 0 : undefined}
  class={mathExpression({ display, class: className })}>{@render children?.()}</svelte:element>
