export type { ImageAsset, ImageFit, ImagePosition, ImageSource } from "./image.variants";
import type { HTMLImgAttributes } from "svelte/elements";
import { type ImageFit, type ImagePosition, type ImageSource } from "./image.variants";
interface Props extends Omit<HTMLImgAttributes, "alt" | "class" | "decoding" | "fetchpriority" | "height" | "loading" | "sizes" | "src" | "srcset" | "style" | "width"> {
    /** Fallback URL, used when no `srcset` candidate or `source` applies. */
    src: string;
    /**
     * Text alternative, required. `alt=""` is refused unless `decorative` says the image carries no
     * information.
     */
    alt: string;
    /** The image carries no information: renders `alt=""`, and `alt` must be empty. */
    decorative?: boolean;
    /** Intrinsic width in px of `src`; with `height` it reserves the box before the bytes arrive. */
    width?: number;
    /** Intrinsic height in px of `src`; with `width` it reserves the box before the bytes arrive. */
    height?: number;
    /**
     * Width divided by height, reserved when the intrinsic size is unknown (or to crop to another
     * shape with `fit`). One of `ratio` or `width` and `height` is required.
     */
    ratio?: number;
    /** Width- or density-described candidates of the same picture, from the app's pipeline. */
    srcset?: string;
    /** Slot widths the browser uses to pick a `w`-described candidate. */
    sizes?: string;
    /**
     * `<picture>` sources tried in order before the `img` — a modern format (AVIF, then WebP) or an
     * art-directed crop. Omitted, a bare `img` renders.
     */
    sources?: readonly ImageSource[];
    /**
     * The Largest Contentful Paint candidate: fetched at high priority, eagerly, and decoded
     * synchronously. Defaults to `false` — lazy loading and async decoding.
     */
    priority?: boolean;
    /** Overrides the loading strategy `priority` implies; rarely needed. */
    loading?: "lazy" | "eager";
    /** How the picture fills its reserved box: `cover` (default) crops, `contain` letterboxes. */
    fit?: ImageFit;
    /** The focal point kept in frame when `cover` crops. Defaults to `center`. */
    position?: ImagePosition;
    /** Extra classes merged onto the `img`. */
    class?: string;
}
declare const Image: import("svelte").Component<Props, {}, "">;
type Image = ReturnType<typeof Image>;
export default Image;
