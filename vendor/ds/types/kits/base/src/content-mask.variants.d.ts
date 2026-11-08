import { type VariantProps } from "tailwind-variants";
/** The complete daisyUI Mask shape and half-mask vocabulary. */
export declare const CONTENT_MASK_SHAPES: readonly ["squircle", "heart", "hexagon", "hexagon-2", "decagon", "pentagon", "diamond", "square", "circle", "star", "star-2", "triangle", "triangle-2", "triangle-3", "triangle-4", "half-1", "half-2"];
export type ContentMaskShape = (typeof CONTENT_MASK_SHAPES)[number];
/** Structural clipping geometry. It names no appearance token or axis. */
export declare const CONTENT_MASK_CLIP_PATHS: Readonly<Record<ContentMaskShape, string>>;
/** Extension seam for the neutral clipping boundary. */
export declare const contentMask: import("tailwind-variants").TVReturnType<{} | {} | {}, undefined, "inline-grid", {} | {}, undefined, import("tailwind-variants").TVReturnTypeLike<unknown, undefined>>;
export type ContentMaskVariants = VariantProps<typeof contentMask>;
