import type { SkeletonShape } from "../skeleton.variants";
/** Passive geometry, shared by Svelte and React without a chart engine. */
export interface SkeletonNode {
    tag: "rect" | "circle" | "path" | "line";
    attrs: Readonly<Record<string, string | number>>;
}
export interface SkeletonGeometry {
    width: number;
    height: number;
    nodes: readonly SkeletonNode[];
    tracks?: string;
}
/** Validates counts before allocating geometry in either native renderer. */
export declare function skeletonCounts(rows?: number, columns?: number): {
    rows: number;
    columns: number;
};
export declare function skeletonGeometry(shape: SkeletonShape, rows?: number, columns?: number): SkeletonGeometry | undefined;
/** SVG attributes use dash spelling in Svelte/HTML and native camel spelling in React. */
export declare function skeletonSvgAttributes(node: SkeletonNode): {
    [k: string]: string | number;
};
/** Serialize only DS-generated, passive geometry; no caller markup or events enter this boundary. */
export declare function skeletonSvgMarkup(geometry: SkeletonGeometry | undefined): string;
