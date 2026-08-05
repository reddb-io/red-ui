// Test fixture — NOT part of the Kit. It intentionally styles the way a
// component must not, so the Kit's anti-hardcode lint has a proven failing
// case for each thing it claims to catch (issue #7).

import { tv } from "tailwind-variants";

export const hardcoded = tv({
  base: "inline-flex rounded-md",
  variants: {
    tone: {
      // A Tailwind default colour: real, resolvable, and frozen — no Theme
      // reassigns it, so it renders identically under base and dark.
      builtin: "bg-blue-500 text-white",
      // An arbitrary value: a Brand colour smuggled past the Tokens Layer.
      arbitrary: "bg-[#e5484d] rounded-[4px]",
      // What passing looks like, in the same file, so the lint is shown to be
      // discriminating rather than merely noisy.
      correct: "bg-primary text-background rounded-lg",
    },
  },
});
