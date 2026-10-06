<!--
  Native related-control grouping with a required visible legend.

  A group can carry help and an error of its own — a radio group nobody has
  answered, a rating that is required. Like Field, Fieldset owns those
  relationships: the child snippet receives the association every control in
  the group spreads onto itself, so each one is described by the help, marked
  invalid and pointed at the error while the error stands.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLFieldsetAttributes } from "svelte/elements";
  import { fieldset, type FieldsetControlProps } from "./fieldset.variants";

  interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class"> {
    /** The accessible name rendered by the fieldset's native legend. */
    legend: string;
    /** Supporting text announced with every control that takes the group's contract. */
    help?: string;
    /** Current validation error for the group, announced and associated with its controls. */
    error?: string;
    /** The native fieldset element for rare imperative access. */
    ref?: HTMLFieldSetElement;
    /** Extra classes merged onto the group. */
    class?: string;
    /** Extra classes merged onto the legend. */
    legendClass?: string;
    /** The grouped controls; spread the received contract onto each one. */
    children?: Snippet<[FieldsetControlProps]>;
  }

  const generatedId = $props.id();
  let {
    legend,
    help,
    error,
    ref = $bindable(),
    class: className,
    legendClass,
    children,
    ...rest
  }: Props = $props();
  const styles = fieldset();

  const baseId = $derived(rest.id ?? `${generatedId}-group`);
  const helpId = $derived(`${baseId}-help`);
  const errorId = $derived(`${baseId}-error`);
  const control = $derived<FieldsetControlProps>({
    "aria-describedby":
      [help ? helpId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? "true" : undefined,
    "aria-errormessage": error ? errorId : undefined,
  });
</script>

<fieldset
  {...rest}
  bind:this={ref}
  class={styles.root({ class: className })}
  data-fieldset-invalid={error ? "true" : undefined}
>
  <legend class={styles.legend({ class: legendClass })}>{legend}</legend>
  {@render children?.(control)}

  {#if help}
    <p class={styles.help()} id={helpId}>{help}</p>
  {/if}

  {#if error}
    <p class={styles.error()} id={errorId} role="alert">{error}</p>
  {/if}
</fieldset>
