import { type VariantProps } from "tailwind-variants";
/**
 * Token-only anchored surface appearance; positioning and focus remain in Popover.svelte.
 * Its width never exceeds the space the positioner reports beside the anchor
 * (bits-ui and Base UI each publish it), so a surface opened beside a rail on
 * a phone narrows instead of running past the viewport and scrolling the page.
 */
export declare const popover: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, string, {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type PopoverVariants = VariantProps<typeof popover>;
/**
 * The stacking layer of an anchored surface's positioned wrapper (ADR 0057).
 * A floating surface is positioned by a wrapper, so its layer belongs there: a
 * z-index on the static surface inside does not stack, and a sticky header or
 * a raised region would paint over the open menu.
 */
export declare const floatingLayer: import("tailwind-variants").TVReturnType<{
    layer: {
        dropdown: "z-[var(--reddb-layer-dropdown)]";
        tooltip: "z-[var(--reddb-layer-tooltip)]";
    };
}, undefined, "", {
    layer: {
        dropdown: "z-[var(--reddb-layer-dropdown)]";
        tooltip: "z-[var(--reddb-layer-tooltip)]";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    layer: {
        dropdown: "z-[var(--reddb-layer-dropdown)]";
        tooltip: "z-[var(--reddb-layer-tooltip)]";
    };
}, undefined>>;
