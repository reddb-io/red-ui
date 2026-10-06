// RadioGroup's public option shape and token-only appearance seam.
//
// Each radio is drawn exactly as a Checkbox is (see checkbox.variants): the
// native input is a control-height pointer target that draws nothing, and a
// glyph-sized round box and dot after it follow its state through `peer-*`.
// A disabled option dims its control and steps its label to secondary ink.

import { tv, type VariantProps } from "tailwind-variants";
import { checkbox, choiceBox } from "./checkbox.variants";
import { fieldset } from "./fieldset.variants";

export interface RadioGroupOption {
  /** Native submitted value for this choice. */
  value: string;
  /** Caller-owned visible label. */
  label: string;
  /** Removes only this option from interaction and submission. */
  disabled?: boolean;
}

const choice = checkbox();

export const radioGroup = tv({
  slots: {
    root: fieldset().root(),
    list: "grid gap-[var(--reddb-spatial-gap-sm)]",
    option: [
      "flex cursor-pointer items-center gap-[var(--reddb-spatial-gap-sm)] text-sm text-foreground",
      "has-disabled:cursor-not-allowed has-disabled:text-ink-muted",
    ].join(" "),
    choice: choice.root(),
    control: choice.control(),
    box: [choiceBox, "rounded-full"].join(" "),
    dot: [
      "pointer-events-none invisible col-start-1 row-start-1 peer-checked:visible",
      "size-[calc(var(--reddb-spatial-icon-size-md)*0.4)] rounded-full bg-on-primary",
      "forced-colors:hidden",
    ].join(" "),
  },
});

export type RadioGroupVariants = VariantProps<typeof radioGroup>;
