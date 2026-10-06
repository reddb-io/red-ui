<!-- One native radio group composed from the canonical Fieldset and Label. -->
<script lang="ts">
  import type { HTMLFieldsetAttributes } from "svelte/elements";
  import Fieldset from "./Fieldset.svelte";
  import Label from "./Label.svelte";
  import { radioGroup, type RadioGroupOption } from "./radio-group.variants";

  interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class" | "name"> {
    /** The required visible accessible name rendered as the native legend. */
    legend: string;
    /** One native form name shared by every radio in the group. */
    name: string;
    /** Caller-owned choices; the group owns their native relationship. */
    options: readonly RadioGroupOption[];
    /** The selected native value, bindable by controlled consumers. */
    value?: string;
    /** Called with the newly chosen value (ADR 0026's value dialect). */
    onvaluechange?: (value: string) => void;
    /** Applies native required validation to the group. */
    required?: boolean;
    /** Supporting text announced with every radio. */
    help?: string;
    /** Current validation error, announced and associated with every radio. */
    error?: string;
    /** Prefix for option ids; otherwise Svelte supplies a stable generated one. */
    id?: string;
    /** Extra classes merged onto the native fieldset. */
    class?: string;
    /** Extra classes merged onto each visible option label. */
    optionClass?: string;
    /** Extra classes merged onto each native radio. */
    controlClass?: string;
  }

  const generatedId = $props.id();
  let {
    legend,
    name,
    options,
    value = $bindable(),
    onvaluechange,
    required = false,
    help,
    error,
    id,
    class: className,
    optionClass,
    controlClass,
    ...rest
  }: Props = $props();
  const styles = radioGroup();
  const idPrefix = $derived(id ?? `${generatedId}-option`);
</script>

<Fieldset {...rest} {legend} {help} {error} class={styles.root({ class: className })}>
  {#snippet children(control)}
    <div class={styles.list()} data-radio-list>
      {#each options as option, index (option.value)}
        {@const optionId = `${idPrefix}-${index}`}
        <Label class={styles.option({ class: optionClass })} for={optionId}>
          <span class={styles.choice()} data-choice-control>
            <input
              {...control}
              id={optionId}
              type="radio"
              {name}
              value={option.value}
              bind:group={value}
              onchange={(event) => onvaluechange?.(event.currentTarget.value)}
              {required}
              disabled={option.disabled}
              class={styles.control({ class: controlClass })}
            />
            <span class={styles.box()} aria-hidden="true" data-choice-box></span>
            <span class={styles.dot()} aria-hidden="true" data-choice-mark></span>
          </span>
          {option.label}
        </Label>
      {/each}
    </div>
  {/snippet}
</Fieldset>
