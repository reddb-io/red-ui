export interface BundlePoint {
    x: number;
    y: number;
}
export interface BundleNodePosition {
    id: string;
    x: number;
    y: number;
}
export interface BundleEdgeInput {
    id: string;
    source: string;
    target: string;
}
export interface BundleOptions {
    /** Global bundling stiffness (spring constant K). */
    stiffness: number;
    /** Initial displacement step size, halved every cycle. */
    stepSize: number;
    /** Number of cycles (each doubles the subdivision count). */
    cycles: number;
    /** Iterations in the first cycle, decayed by iterationRate each cycle. */
    iterations: number;
    /** Multiplicative decay applied to the iteration count per cycle. */
    iterationRate: number;
    /** Factor the subdivision-point count grows by each cycle. */
    subdivisionRate: number;
    /** Edges with a combined compatibility below this don't attract. */
    compatibilityThreshold: number;
}
export declare const DEFAULT_BUNDLE_OPTIONS: BundleOptions;
export declare const BUNDLE_EDGE_LIMIT = 1500;
/**
 * Run force-directed edge bundling. Returns a polyline (source → … → target,
 * endpoints included) for every input edge whose endpoints resolve. Edges that
 * are dropped, self-loops, or zero-length get a straight two-point polyline so
 * the caller always has geometry to draw.
 */
export declare function bundleEdges(nodes: BundleNodePosition[], edges: BundleEdgeInput[], options?: Partial<BundleOptions>): Map<string, BundlePoint[]>;
/**
 * Map a bundled polyline onto a single sigma `curvature` value: the signed
 * perpendicular deviation of its most-displaced point, scaled so a quadratic
 * Bézier reproduces that bow (mid-curve deviation = ½·curvature·length).
 *
 * Sigma's WebGL scene flips y relative to layout space, so the caller negates
 * this when feeding @sigma/edge-curve. Returns 0 for straight / degenerate
 * polylines.
 */
export declare function edgeCurvature(points: BundlePoint[]): number;
/**
 * Count proper crossings between distinct polylines (straight edges are
 * two-point polylines). A correctness primitive for the geometry; note that
 * FDEB does *not* aim to reduce topological crossings (two edges with
 * interleaved endpoints must cross however they are routed) — use `edgeInk`
 * to measure the clutter reduction bundling actually delivers.
 */
export declare function countEdgeCrossings(polylines: BundlePoint[][]): number;
/**
 * "Edge ink": the number of distinct grid cells the edge polylines paint, at a
 * given cell size. This is the standard quality measure for edge bundling —
 * the visual signal behind "untangle the hairball". Bundling routes compatible
 * edges onto shared trunks, so their strokes overlap and the painted area (and
 * thus the visible crossing clutter) drops measurably. Lower is tighter.
 */
export declare function edgeInk(polylines: BundlePoint[][], cellSize: number): number;
