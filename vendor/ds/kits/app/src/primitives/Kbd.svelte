<!--
  Kbd — a Primitive: it imports no other Kit component.

  Renders the platform's own <kbd>, so a screen reader announces a key as a
  key. The `keys` prop is the whole behavior: a chord is a list, joined by a
  separator the component owns, so "Ctrl then K" is never written as one
  string that a future keyboard-hint feature would have to parse back apart.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { kbd, kbdChord, type KbdSize } from "./kbd.variants";

  interface Props extends Omit<HTMLAttributes<HTMLElement>, "class"> {
    /**
     * The chord, as its parts: `["Ctrl", "K"]`. A single key is a one-element
     * list. Ignored when a `children` snippet is given.
     */
    keys?: readonly string[];
    /** Rendered between the parts of a chord. */
    separator?: string;
    /** Defaults to `md`. */
    size?: KbdSize;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    children?: Snippet;
  }

  const {
    keys = [],
    separator = "+",
    size = "md",
    class: className,
    children,
    ...rest
  }: Props = $props();

  const chord = kbdChord();
</script>

{#if children}
  <kbd {...rest} class={kbd({ size, class: className })}>{@render children()}</kbd>
{:else}
  <!-- A chord is a <kbd> per key, wrapped in a <kbd> for the chord as a whole:
       that is the nesting the HTML spec describes, and it is what lets the
       separator stay outside the key caps. -->
  <kbd {...rest} class={chord.root()}>
    {#each keys as key, index (index)}
      {#if index > 0}<span aria-hidden="true" class={chord.separator()}>{separator}</span>{/if}
      <kbd class={kbd({ size, class: className })}>{key}</kbd>
    {/each}
  </kbd>
{/if}
