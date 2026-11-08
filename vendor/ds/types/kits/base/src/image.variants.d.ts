import { type VariantProps } from "tailwind-variants";
/**
 * The Image's appearance: a block that never overflows its container, whose
 * box is reserved before the bytes arrive (the intrinsic `width`/`height` or
 * the caller's `ratio` set it), and whose fit and focal position are named
 * values rather than raw `object-*` declarations.
 */
export declare const image: import("tailwind-variants").TVReturnType<{
    /** How the picture fills the box its dimensions or ratio reserve. */
    fit: {
        cover: "object-cover";
        contain: "object-contain";
    };
    /** The focal point kept in frame when `cover` crops. */
    position: {
        center: "object-center";
        top: "object-top";
        bottom: "object-bottom";
        start: "object-left";
        end: "object-right";
    };
}, undefined, "block h-auto max-w-full", {
    /** How the picture fills the box its dimensions or ratio reserve. */
    fit: {
        cover: "object-cover";
        contain: "object-contain";
    };
    /** The focal point kept in frame when `cover` crops. */
    position: {
        center: "object-center";
        top: "object-top";
        bottom: "object-bottom";
        start: "object-left";
        end: "object-right";
    };
}, undefined, import("tailwind-variants").TVReturnTypeLike<{
    /** How the picture fills the box its dimensions or ratio reserve. */
    fit: {
        cover: "object-cover";
        contain: "object-contain";
    };
    /** The focal point kept in frame when `cover` crops. */
    position: {
        center: "object-center";
        top: "object-top";
        bottom: "object-bottom";
        start: "object-left";
        end: "object-right";
    };
}, undefined>>;
export type ImageVariants = VariantProps<typeof image>;
export type ImageFit = NonNullable<ImageVariants["fit"]>;
export type ImagePosition = NonNullable<ImageVariants["position"]>;
export declare const IMAGE_FITS: readonly ["cover", "contain"];
export declare const IMAGE_POSITIONS: readonly ["center", "top", "bottom", "start", "end"];
/** One `<source>` of a `<picture>`: a modern format or an art-directed crop the app produced. */
export interface ImageSource {
    /** Candidate URLs with `w` or `x` descriptors, as the app's asset pipeline wrote them. */
    srcset: string;
    /** MIME type the browser checks before choosing this source, such as `image/avif`. */
    type?: string;
    /** Media condition for an art-directed crop, such as `(min-width: 48rem)`. */
    media?: string;
    /** Slot widths for this source's `w` descriptors; the Image's `sizes` when omitted. */
    sizes?: string;
}
/**
 * The image an application's asset pipeline produced, as a composite accepts it.
 *
 * The DS never resizes or re-encodes anything: the application owns its
 * pipeline and passes the URLs (and the intrinsic size) that pipeline wrote.
 */
export interface ImageAsset {
    /** Fallback URL, used when no `srcset` candidate or `source` applies. */
    src: string;
    /** Text alternative. Empty only together with `decorative`. */
    alt: string;
    /** The image carries no information; renders `alt=""`. */
    decorative?: boolean;
    /** Intrinsic width in px of `src`. */
    width?: number;
    /** Intrinsic height in px of `src`. */
    height?: number;
    /** Width divided by height, when the intrinsic size is unknown. */
    ratio?: number;
    /** Width- or density-described candidates of the same picture. */
    srcset?: string;
    /** Slot widths for the `srcset` candidates. */
    sizes?: string;
    /** `<picture>` sources tried before the `img`, in order (AVIF, then WebP, …). */
    sources?: readonly ImageSource[];
}
/**
 * Refuse an image that would hide from assistive technology or shift the
 * layout: `alt=""` only with `decorative`, and a box from `width` and
 * `height` or from `ratio`. Thrown rather than warned — an unsized or
 * unlabelled image is a defect in every Theme × Color Scheme × Density.
 */
export declare function assertImageContract(asset: {
    alt?: string;
    decorative?: boolean;
    width?: number;
    height?: number;
    ratio?: number;
}): void;
/** The aspect ratio an Image reserves: the caller's `ratio`, else its intrinsic size. */
export declare function imageRatio(asset: {
    width?: number;
    height?: number;
    ratio?: number;
}): number;
