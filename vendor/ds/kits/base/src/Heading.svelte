<!-- A heading whose outline level and type role are separate decisions (ADR 0025). -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import {
    defaultHeadingRole,
    heading,
    type HeadingLevel,
    type HeadingRole,
  } from "./heading.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class" | "role"> {
    /** Document outline depth: renders `h1`…`h6`. */
    level?: HeadingLevel;
    /**
     * The Theme type role it reads as — independent of `level`. Defaults to
     * `title` at level 1 and `heading` below it.
     */
    role?: HeadingRole;
    /** Extra classes merged onto the heading element. */
    class?: string;
    /** The heading text or inline content. */
    children: Snippet;
  }

  const { level = 2, role, class: className, children, ...rest }: Props = $props();

  const resolvedRole = $derived(role ?? defaultHeadingRole(level));
</script>

<svelte:element
  this={`h${level}`}
  {...rest}
  data-heading
  data-type-role={resolvedRole}
  class={heading({ role: resolvedRole, class: className })}
>{@render children()}</svelte:element>
