// Test fixture — NOT part of the Kit. It writes spatial values the four ways a
// component variant map must not, so the Kit's anti-hardcode lint has a proven
// failing case for each thing the spatial rule claims to catch (issue #34).
//
// Everything here would render: these are real utilities resolving to real
// lengths. That is the point — a frozen spatial value is invisible in a
// screenshot and only shows up when a consumer declares a density stop and the
// component refuses to move.

import { tv } from "tailwind-variants";

export const rawSpatial = tv({
  base: "inline-flex rounded-md h-9 gap-2",
  variants: {
    size: {
      // A fixed Tailwind step the axis owns: 2rem and 0.75rem are exactly what
      // control-height-sm and inset-sm render at under the neutral stop, so
      // these positions have a role to route through and are frozen without it.
      step: "h-8 px-3 gap-1",
      // The same freeze, written as a length rather than as a step. An
      // arbitrary value is the Kit's one escape hatch, and it holds a token
      // reference or nothing.
      length: "h-[2.75rem] px-[1.5rem] gap-[0.5rem]",
      // A Brand step named directly: a real token, resolvable, and still
      // frozen — a stop reassigns the spatial roles, never the scale they land
      // on, so this renders the same at every stop.
      brand: "py-[var(--reddb-space-6)]",
      // A role the axis does not ship. In a browser this resolves to nothing
      // and the declaration is simply dropped, which is why the lint has to be
      // the one to say so.
      unknown: "h-[var(--reddb-spatial-control-height-xl)]",
      // What passing looks like, in the same file, so the rule is shown to be
      // discriminating rather than merely noisy.
      correct:
        "h-[var(--reddb-spatial-control-height-md)] px-[var(--reddb-spatial-inset-md)] gap-[var(--reddb-spatial-gap-md)]",
      // …and so is a value the axis ships no role at: a notch of inset, a
      // half-step of gap, an icon scale. Routing one of those would either move
      // what the neutral renders or invent a role the Tokens Layer does not
      // ship, so the lint leaves them where they are.
      notched: "px-2 py-0.5 gap-1.5 size-4 w-full",
    },
  },
});
