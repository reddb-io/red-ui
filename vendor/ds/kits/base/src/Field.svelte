<!--
  Field — the accessible contract around one form control.

  Field owns the relationships: its label targets the control id, help and
  error text describe it, an error marks it invalid, and required reaches both
  the visible label and the native control. The child snippet receives that
  complete contract, which keeps Input native and lets a consumer substitute a
  local control without reconstructing accessibility ids.
-->
<script lang="ts">
  import type { Snippet } from "svelte";
  import { field, type FieldControlProps, type FieldLayout } from "./field.variants";
  import Label from "./Label.svelte";

  interface Props {
    /** Visible label text. */
    label: string;
    /** Supporting text announced with the control. */
    help?: string;
    /** Current validation error, announced and associated with the control. */
    error?: string;
    /** Makes the requirement visible and native. */
    required?: boolean;
    /** Explicit control id; otherwise Svelte supplies a stable generated one. */
    id?: string;
    /**
     * Where the label sits. `stacked` (the default) puts it above the control;
     * `inline` puts the control first with the label beside it — the binary
     * choices' layout — and aligns help and error text with the label.
     */
    layout?: FieldLayout;
    /** Extra classes on the Field root. */
    class?: string;
    /** The canonical Input or a consumer-owned control. */
    children: Snippet<[FieldControlProps]>;
  }

  const generatedId = $props.id();
  const {
    label,
    help,
    error,
    required = false,
    id,
    layout = "stacked",
    class: className,
    children,
  }: Props = $props();

  const controlId = $derived(id ?? `${generatedId}-control`);
  const helpId = $derived(`${controlId}-help`);
  const errorId = $derived(`${controlId}-error`);
  const describedBy = $derived([help ? helpId : undefined, error ? errorId : undefined].filter(Boolean).join(" ") || undefined);
  const control = $derived<FieldControlProps>({
    id: controlId,
    required: required ? true : undefined,
    "aria-describedby": describedBy,
    "aria-invalid": error ? "true" : undefined,
    "aria-errormessage": error ? errorId : undefined,
  });
  const styles = $derived(field({ layout }));
</script>

<div
  class={styles.root({ class: className })}
  data-field-layout={layout}
  data-field-invalid={error ? "true" : undefined}
>
  {#if layout === "inline"}{@render children(control)}{/if}

  <Label class={styles.label()} for={controlId}>
    {label}{#if required}<span class={styles.required()} aria-hidden="true">*</span><span class="sr-only"> (required)</span>{/if}
  </Label>

  {#if layout !== "inline"}{@render children(control)}{/if}

  {#if help}
    <p class={styles.help()} id={helpId}>{help}</p>
  {/if}

  {#if error}
    <p class={styles.error()} id={errorId} role="alert">{error}</p>
  {/if}
</div>
