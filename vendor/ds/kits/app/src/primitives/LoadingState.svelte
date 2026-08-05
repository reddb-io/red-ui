<!--
  LoadingState — a Primitive: it imports no other Kit component.

  A spinner is a picture of waiting; the sentence next to it is the waiting
  itself, as far as anything that cannot see the page is concerned. So the
  label is required to exist (it has a default), the spinner is
  `aria-hidden`, and the region announces itself through `role="status"` with
  `aria-live="polite"` — a load that finishes is news, not an interruption.
-->
<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";
  import { loadingState, type LoadingStateSize } from "./loading-state.variants";

  interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** What is being waited for. Defaults to a generic sentence. */
    label?: string;
    /** Defaults to `md`. */
    size?: LoadingStateSize;
    /** Announce the label without drawing it. Defaults to false. */
    labelHidden?: boolean;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
  }

  const {
    label = "Loading…",
    size = "md",
    labelHidden = false,
    class: className,
    ...rest
  }: Props = $props();

  const slots = $derived(loadingState({ size, labelHidden }));
</script>

<div
  {...rest}
  class={slots.root({ class: className })}
  role="status"
  aria-live="polite"
  aria-busy="true"
>
  <!-- The arc is drawn as a quarter of the circle it spins inside: the track
       shows where it is going, which is what makes the rotation readable. -->
  <svg class={slots.spinner()} viewBox="0 0 24 24" aria-hidden="true">
    <circle class={slots.track()} cx="12" cy="12" r="9" stroke-width="3" />
    <path class={slots.head()} d="M21 12a9 9 0 0 0-9-9" stroke-width="3" stroke-linecap="round" />
  </svg>

  <span class={slots.label()}>{label}</span>
</div>
