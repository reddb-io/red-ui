<!-- A native range input composed through the canonical Field relationship. -->
<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import Field from "./Field.svelte";
  import { slider } from "./slider.variants";

  interface Props extends Omit<HTMLInputAttributes, "children" | "class" | "id" | "max" | "min" | "step" | "type" | "value"> {
    /** Required visible name supplied through Field. */
    label: string;
    /** Supporting text announced with the slider. */
    help?: string;
    /** Current validation error, announced and associated with the slider. */
    error?: string;
    /** Makes the requirement visible on the label and native on the range input. */
    required?: boolean;
    /** Explicit id for the range input; otherwise Field generates a stable one. */
    id?: string;
    /** Current native numeric value. */
    value?: number;
    /** Called with the newly chosen value (ADR 0026's value dialect). */
    onvaluechange?: (value: number) => void;
    /** Lowest selectable value; defaults to `0`. */
    min?: number;
    /** Highest selectable value; defaults to `100`. */
    max?: number;
    /** Increment between selectable values, or `any` for no snapping; defaults to `1`. */
    step?: number | "any";
    /** Visible and accessible wording for the current numeric value. */
    formatValue?: (value: number) => string;
    /** Extra classes merged onto the range input itself, over its own. */
    class?: string;
    /** Extra classes merged onto the Field root that wraps the label and the slider. */
    fieldClass?: string;
    /** Extra classes merged onto the live readout of the current value. */
    outputClass?: string;
    /** The native range input, bindable for rare imperative access. */
    ref?: HTMLInputElement;
  }

  let {
    label,
    help,
    error,
    required = false,
    id,
    value = $bindable(0),
    onvaluechange,
    min = 0,
    max = 100,
    step = 1,
    formatValue,
    class: className,
    fieldClass,
    outputClass,
    ref = $bindable(),
    oninput,
    ...rest
  }: Props = $props();
  const styles = slider();
  const formatted = $derived(formatValue ? formatValue(value) : String(value));
</script>

<div class={styles.root()} data-slider>
  <Field {label} {help} {error} {required} {id} class={fieldClass}>
    {#snippet children(control)}
      <input
        {...rest}
        {...control}
        bind:this={ref}
        bind:value
        oninput={(event) => {
          oninput?.(event);
          onvaluechange?.(event.currentTarget.valueAsNumber);
        }}
        type="range"
        {min}
        {max}
        {step}
        aria-valuetext={formatValue ? formatted : undefined}
        class={styles.control({ class: className })}
      />
      <output class={styles.output({ class: outputClass })} for={control.id} aria-live="polite">
        {formatted}
      </output>
    {/snippet}
  </Field>
</div>
