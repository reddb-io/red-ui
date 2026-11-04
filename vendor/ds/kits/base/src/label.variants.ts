// Label's token-only appearance seam. Association stays native through `for`.
import { tv, type VariantProps } from "tailwind-variants";
import { typeRoleMerge } from "./type-roles";

export const label = tv({
  base: "text-sm font-medium text-foreground",
}, typeRoleMerge);

export type LabelVariants = VariantProps<typeof label>;
