import { tv } from "tailwind-variants";
import { typeRoleMerge } from "./type-roles";
export const radialContent = tv({ slots: {
  root: "grid min-w-0 max-w-full justify-items-center gap-[var(--reddb-spatial-gap-sm)] text-center text-foreground",
  title: "max-w-full truncate text-caption text-ink-muted",
  value: "max-w-full truncate text-heading font-medium tabular-nums",
  description: "max-w-full truncate text-caption text-ink-muted",
} }, typeRoleMerge);
