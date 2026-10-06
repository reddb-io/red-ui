import type { HTMLInputAttributes } from "svelte/elements";
import { tv, type VariantProps } from "tailwind-variants";

/** One caller-owned checkout field rendered through canonical Field and Input. */
export interface CheckoutField {
  name: string;
  label: string;
  type?: HTMLInputAttributes["type"];
  value?: string | number;
  autocomplete?: HTMLInputAttributes["autocomplete"];
  inputmode?: HTMLInputAttributes["inputmode"];
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

/** A visibly named caller-owned group of checkout fields. */
export interface CheckoutSection {
  legend: string;
  fields: readonly CheckoutField[];
  disabled?: boolean;
}

/**
 * Token-only arrangement around canonical Base form contracts. Form and
 * Fieldset own the rhythm between their own children (ADR 0024): rows sit
 * `layout-gap-md` apart and a group's fields `layout-gap-sm`, so neither the
 * root nor a section re-spaces them.
 */
export const checkoutForm = tv({
  slots: {
    root: "w-full min-w-0",
    error: "m-0 font-medium text-feedback-danger-foreground",
    section: "min-w-0",
    actions: "flex flex-wrap items-center justify-end gap-[var(--reddb-spatial-gap-md)]",
  },
});

export type CheckoutFormVariants = VariantProps<typeof checkoutForm>;
