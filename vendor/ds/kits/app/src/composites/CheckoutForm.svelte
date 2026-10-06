<!-- Checkout field groups composed from the canonical native Form contract. -->
<script lang="ts">
  import { Button, Field, Fieldset, Form, Input } from "@reddb-io/design-system/base";
  import type { Snippet } from "svelte";
  import type { HTMLFormAttributes } from "svelte/elements";
  import { checkoutForm, type CheckoutSection } from "./checkout-form.variants";

  interface Props extends Omit<HTMLFormAttributes, "children" | "class"> {
    /** Caller-owned field groups; the component owns only their associations. */
    sections?: readonly CheckoutSection[];
    /** Advanced seam for caller-owned controls and grouped business content. */
    children?: Snippet;
    /** Form-level failure associated with the native form boundary. */
    error?: string;
    /** Default native submit label when no actions snippet is supplied. */
    submitLabel?: string;
    /** Caller-owned submit and secondary actions. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own, onto the form. */
    class?: string;
    /** Extra classes, merged over the section slot's own, onto each section's fieldset. */
    sectionClass?: string;
    /**
     * Extra classes, merged over the actions slot's own, onto the wrapper around the actions or
     * submit button.
     */
    actionsClass?: string;
  }

  const uid = $props.id();
  const {
    sections = [],
    children,
    error,
    submitLabel,
    actions,
    class: className,
    sectionClass,
    actionsClass,
    ...rest
  }: Props = $props();
  const errorId = `${uid}-error`;
  const describedBy = $derived(
    [rest["aria-describedby"], error ? errorId : undefined].filter(Boolean).join(" ") || undefined,
  );
  const styles = checkoutForm();
</script>

<Form
  {...rest}
  aria-describedby={describedBy}
  data-checkout-form
  class={styles.root({ class: className })}
>
  {#if error}
    <p id={errorId} role="alert" data-checkout-error class={styles.error()}>{error}</p>
  {/if}

  {@render children?.()}

  {#each sections as section, sectionIndex (`${section.legend}-${sectionIndex}`)}
    <Fieldset
      legend={section.legend}
      disabled={section.disabled}
      class={styles.section({ class: sectionClass })}
    >
      {#each section.fields as field, fieldIndex (`${field.name}-${fieldIndex}`)}
        <Field
          label={field.label}
          help={field.help}
          error={field.error}
          required={field.required}
          id={`${uid}-${sectionIndex}-${fieldIndex}`}
        >
          {#snippet children(control)}
            <Input
              {...control}
              name={field.name}
              type={field.type ?? "text"}
              value={field.value}
              autocomplete={field.autocomplete}
              inputmode={field.inputmode}
              placeholder={field.placeholder}
              disabled={field.disabled}
            />
          {/snippet}
        </Field>
      {/each}
    </Fieldset>
  {/each}

  {#if actions || submitLabel}
    <div data-checkout-actions class={styles.actions({ class: actionsClass })}>
      {#if actions}
        {@render actions()}
      {:else if submitLabel}
        <Button type="submit">{submitLabel}</Button>
      {/if}
    </div>
  {/if}
</Form>
