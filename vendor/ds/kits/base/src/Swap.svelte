<!-- Two caller-owned faces over the canonical ToggleButton pressed contract. -->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import ToggleButton from "./ToggleButton.svelte";
  import { warnDeprecated } from "./deprecation";
  import { swap } from "./swap.variants";

  interface Props extends Omit<HTMLButtonAttributes, "aria-pressed" | "children" | "class" | "onclick" | "onchange" | "type"> {
    /** Stable accessible name; changing faces never changes the control's purpose. */
    label: string;
    /** Which face is visible, bindable for controlled consumers. */
    swapped?: boolean;
    /** Content shown in the initial, unpressed state. Defaults to `label`. */
    off?: Snippet;
    /** Content shown in the swapped, pressed state. Defaults to `label`. */
    on?: Snippet;
    /** Disables the control, so activation neither swaps the face nor reports a change. */
    disabled?: boolean;
    /**
     * Extra classes merged onto the underlying ToggleButton, over the Swap's own one-cell layout.
     */
    class?: string;
    /** Called with the click event on activation, before `onswappedchange`. */
    onclick?: HTMLButtonAttributes["onclick"];
    /** Reports the next state after activation (ADR 0026: `on<state>change` for `bind:<state>`). */
    onswappedchange?: (swapped: boolean) => void;
    /** @deprecated Renamed `onswappedchange` (ADR 0026); removed next release. */
    onchange?: (swapped: boolean) => void;
  }

  let {
    label,
    swapped = $bindable(false),
    off,
    on,
    disabled = false,
    class: className,
    onclick,
    onswappedchange,
    onchange,
    ...rest
  }: Props = $props();

  function activate(event: MouseEvent): void {
    onclick?.(event as Parameters<NonNullable<HTMLButtonAttributes["onclick"]>>[0]);
    onswappedchange?.(swapped);
    onchange?.(swapped);
  }

  $effect(() => {
    if (onchange) warnDeprecated("Swap", "onchange", "onswappedchange");
  });
</script>

<ToggleButton
  {...rest}
  {label}
  {disabled}
  bind:pressed={swapped}
  class={swap({ class: className })}
  data-swap
  onclick={activate}
>
  {#if swapped}
    {#if on}{@render on()}{:else}{label}{/if}
  {:else}
    {#if off}{@render off()}{:else}{label}{/if}
  {/if}
</ToggleButton>
