<!--
  Select — the canonical Base choice control.

  The options belong to the caller, while the platform keeps the popup,
  keyboard interaction, focus, selection, validation and form semantics.
-->
<script module lang="ts">
  export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLSelectAttributes } from "svelte/elements";
  import { select, type SelectSize } from "./select.variants";

  interface Props extends Omit<HTMLSelectAttributes, "children" | "class" | "value"> {
    /** The native option and optgroup content. */
    children?: Snippet;
    /** Flat caller-owned choices for compositions that do not need custom option markup. */
    options?: readonly SelectOption[];
    /** The native select, available for imperative focus. */
    ref?: HTMLSelectElement;
    /** Current native value, bindable for canonical compositions. */
    value?: HTMLSelectAttributes["value"];
    /** Called with the newly selected value (ADR 0026's value dialect); the native `onchange` still receives the Event. */
    onvaluechange?: (value: string) => void;
    /**
     * The control height step, matching Button's `size` (default `md`). Named
     * apart from the native `size` attribute, which is still spread through.
     */
    controlSize?: SelectSize;
    /** Extra classes, merged over the canonical appearance. */
    class?: string;
  }

  let {
    ref = $bindable(),
    value = $bindable(),
    onvaluechange,
    onchange,
    children,
    options = [],
    controlSize = "md",
    class: className,
    ...rest
  }: Props = $props();
</script>

<select
  {...rest}
  bind:this={ref}
  bind:value
  onchange={(event) => {
    onchange?.(event);
    onvaluechange?.(event.currentTarget.value);
  }}
  class={select({ size: controlSize, class: className })}>
  {#each options as option (option.value)}
    <option value={option.value} disabled={option.disabled}>{option.label}</option>
  {/each}
  {@render children?.()}
</select>
