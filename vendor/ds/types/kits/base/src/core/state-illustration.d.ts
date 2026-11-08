import { type ColorToken } from "./color-token";
/** Only passive SVG geometry is admitted in an illustration asset. */
export type IllustrationTag = "g" | "path" | "circle" | "ellipse" | "rect" | "line" | "polyline" | "polygon";
/** A small tree of static geometry; it never contains text, scripts, HTML or remote resources. */
export interface IllustrationNode {
    /** Passive SVG element. */
    readonly tag: IllustrationTag;
    /** Geometry and token-backed paint attributes. */
    readonly attrs: Readonly<Record<string, string>>;
    /** Nested geometry, used for transforms. */
    readonly children?: readonly IllustrationNode[];
}
/** Import a named asset from base/illustrations; its geometry is shared across frameworks. */
export interface StateIllustrationAsset {
    /** Stable identity for exports and downloads. */
    readonly name: string;
    /** Short English catalogue label, separate from application copy. */
    readonly label: string;
    /** Meaning and suggested use, never inserted into the illustration. */
    readonly description: string;
    /** Passive geometry, with a 480 by 300 viewBox. */
    readonly nodes: readonly IllustrationNode[];
}
/** Internal asset constructor. Public consumers import named, frozen assets. */
export declare function defineStateIllustration(asset: StateIllustrationAsset): StateIllustrationAsset;
/** Validate geometry at the render boundary, including after server/client serialization. */
export declare function illustrationNodes(asset: StateIllustrationAsset): readonly IllustrationNode[];
/** Apply an optional colour token without changing the source asset. */
export declare function illustrationAttributes(node: IllustrationNode, accent?: ColorToken): Record<string, string>;
/** Standalone, transparent SVG source, with no framework, fonts or external resources. */
export declare function illustrationSvg(asset: StateIllustrationAsset, accent?: ColorToken): string;
