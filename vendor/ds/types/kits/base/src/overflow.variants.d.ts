import { type VariantProps } from "tailwind-variants";
/**
 * Text: `wrap` breaks between words and inside one only when it alone is wider
 * than the box; `truncate` clamps to 1–3 lines with an ellipsis (the caller
 * keeps the full text as the accessible name or title); `anywhere` is for
 * opaque tokens only — secrets, hashes, IDs, URLs, code.
 */
export declare const textOverflow: import("tailwind-variants").TVReturnType<{
    policy: {
        wrap: "wrap-break-word";
        truncate: "";
        anywhere: "wrap-anywhere";
    };
    lines: {
        1: "";
        2: "";
        3: "";
    };
}, undefined, "min-w-0", {
    policy: {
        wrap: "wrap-break-word";
        truncate: "";
        anywhere: "wrap-anywhere";
    };
    lines: {
        1: "";
        2: "";
        3: "";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    policy: {
        wrap: "wrap-break-word";
        truncate: "";
        anywhere: "wrap-anywhere";
    };
    lines: {
        1: "";
        2: "";
        3: "";
    };
}, undefined>>;
/**
 * Rows: `wrap` adds lines and keeps each item whole; `scroll` keeps one line
 * that scrolls inside its own contour (focus rings drawn inside the item);
 * `collapse` keeps one line and leaves the items past the fit to a "More"
 * control, which the adapter measures with `fitCount`. A collapsing root takes
 * the full width its container gives it, so its own width never follows the
 * items it is deciding to hide.
 */
export declare const rowOverflow: import("tailwind-variants").TVReturnType<{
    policy: {
        wrap: {
            root: string;
            item: string;
        };
        scroll: {
            root: string;
            item: string;
        };
        collapse: {
            root: string;
            item: string;
        };
    };
}, {
    root: string;
    item: string;
    more: string;
}, undefined, {
    policy: {
        wrap: {
            root: string;
            item: string;
        };
        scroll: {
            root: string;
            item: string;
        };
        collapse: {
            root: string;
            item: string;
        };
    };
}, {
    root: string;
    item: string;
    more: string;
}, import("tailwind-variants").TVReturnTypeLike<{
    policy: {
        wrap: {
            root: string;
            item: string;
        };
        scroll: {
            root: string;
            item: string;
        };
        collapse: {
            root: string;
            item: string;
        };
    };
}, {
    root: string;
    item: string;
    more: string;
}>>;
export type TextOverflowVariants = VariantProps<typeof textOverflow>;
export type RowOverflowVariants = VariantProps<typeof rowOverflow>;
