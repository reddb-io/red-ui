<!-- One native radio value composed from the canonical Fieldset and Label. -->
<script lang="ts">
  import type { HTMLFieldsetAttributes } from "svelte/elements";
  import Fieldset from "./Fieldset.svelte";
  import Label from "./Label.svelte";
  import { rating } from "./rating.variants";

  interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class" | "name"> {
    /** Required visible group name rendered as a native legend. */
    legend: string;
    /** One native name shared by every rating radio. */
    name: string;
    /** Current rating; zero means no option is selected. */
    value?: number;
    /** Called with the newly chosen value (ADR 0026's value dialect). */
    onvaluechange?: (value: number) => void;
    /** Number of rating stops. */
    max?: number;
    /**
     * Marks every rating radio as required, so the native form refuses a submit while none is
     * chosen.
     */
    required?: boolean;
    /** Supporting text announced with every rating stop. */
    help?: string;
    /** Current validation error, announced and associated with every rating stop. */
    error?: string;
    /**
     * Prefix for the ids of the rating radios, joined with each stop's number; generated when
     * omitted.
     */
    id?: string;
    /** Extra classes, merged onto the fieldset root. */
    class?: string;
    /** Extra classes merged onto each stop's label, over its own. */
    optionClass?: string;
    /** Extra classes merged onto each visually hidden radio input. */
    controlClass?: string;
    /** Extra classes merged onto each star mark, over its own. */
    markClass?: string;
    /** Extra classes merged onto the live "n of max" readout under the stops. */
    outputClass?: string;
  }

  const generatedId = $props.id();
  let {
    legend,
    name,
    value = $bindable(0),
    onvaluechange,
    max = 5,
    required = false,
    help,
    error,
    id,
    class: className,
    optionClass,
    controlClass,
    markClass,
    outputClass,
    ...rest
  }: Props = $props();
  const styles = rating();
  const stops = $derived(Array.from({ length: Math.max(1, Math.floor(max)) }, (_, index) => index + 1));
  const idPrefix = $derived(id ?? `${generatedId}-rating`);
</script>

<Fieldset {...rest} {legend} {help} {error} class={styles.root({ class: className })} data-rating>
  {#snippet children(control)}
    <div class={styles.list()} data-rating-list>
      {#each stops as stop}
        {@const optionId = `${idPrefix}-${stop}`}
        <Label class={styles.option({ class: optionClass })} for={optionId}>
          <input
            {...control}
            id={optionId}
            type="radio"
            {name}
            value={stop}
            bind:group={value}
            onchange={(event) => onvaluechange?.(Number(event.currentTarget.value))}
            {required}
            class={styles.control({ class: controlClass })}
          />
          <span class={styles.mark({ class: markClass })} data-rating-mark aria-hidden="true">
            {stop <= value ? "★" : "☆"}
          </span>
          <span class="sr-only">{stop} of {stops.length}</span>
        </Label>
      {/each}
    </div>
    <output class={styles.output({ class: outputClass })} aria-live="polite">
      {value} of {stops.length}
    </output>
  {/snippet}
</Fieldset>
