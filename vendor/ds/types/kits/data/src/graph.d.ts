/** Pure normalization, structural analysis, grouping, and search for the Data Kit network Graph. */
export declare const GRAPH_COLOR_TOKENS: readonly ["var(--reddb-color-series-1)", "var(--reddb-color-series-2)", "var(--reddb-color-series-3)", "var(--reddb-color-series-4)", "var(--reddb-color-series-5)", "var(--reddb-color-series-6)"];
export declare const GRAPH_EDGE_COLOR_TOKEN: "var(--reddb-color-control-edge)";
export declare const GRAPH_MUTED_COLOR_TOKEN: "var(--reddb-color-ink-muted)";
export declare const GRAPH_FOCUSED_SCALE = 1.3;
export declare const GRAPH_FOCUS_PULSE_SCALE = 0.05;
export declare const GRAPH_NEIGHBOUR_SCALE = 1.12;
export declare const GRAPH_REST_SCALE = 0.9;
export declare const GRAPH_NEIGHBOUR_LABEL_LIMIT = 36;
export declare const GRAPH_EDGE_LABEL_MAX_LENGTH = 28;
export declare const GRAPH_LAYOUT_MIN_ITERATIONS = 20;
export declare const GRAPH_LAYOUT_MAX_ITERATIONS = 100;
export declare const GRAPH_LAYOUT_ITERATIONS_PER_NODE = 2;
export declare const GRAPH_LAYOUT_GRAVITY = 0.08;
export declare const GRAPH_LAYOUT_SCALING_RATIO = 8;
/** Minimum rendered point-cloud span on each usable canvas axis after fitting. */
export declare const GRAPH_LAYOUT_MIN_AXIS_FILL = 0.72;
export declare const GRAPH_SUPERNODE_BASE_SIZE = 12;
export declare const GRAPH_SUPERNODE_MEMBER_SCALE = 4;
export declare const GRAPH_ENGINE_STAGE_PADDING = 24;
export type GraphMetadata = Record<string, unknown>;
export type GraphColorToken = (typeof GRAPH_COLOR_TOKENS)[number] | typeof GRAPH_EDGE_COLOR_TOKEN | typeof GRAPH_MUTED_COLOR_TOKEN;
export interface GraphNode {
    /** Stable node identity. */
    id: string;
    label?: string;
    /** Caller-owned community identity. Omit it to let the engine detect communities. */
    community?: string;
    /** Optional semantic DS token override. Raw colors are intentionally unsupported. */
    color?: GraphColorToken;
    size?: number;
    x?: number;
    y?: number;
    /** Caller-owned domain data. The design system transports but never interprets it. */
    metadata?: GraphMetadata;
}
export interface GraphEdge {
    id?: string;
    source: string;
    target: string;
    label?: string;
    weight?: number;
    /** Optional semantic DS token override. Raw colors are intentionally unsupported. */
    color?: GraphColorToken;
    /** Caller-owned domain data. The design system transports but never interprets it. */
    metadata?: GraphMetadata;
}
export interface GraphData {
    nodes: readonly GraphNode[];
    edges: readonly GraphEdge[];
}
export interface ShapedGraphNode {
    id: string;
    label: string;
    community: string;
    communityExplicit: boolean;
    color: GraphColorToken;
    size: number;
    x: number;
    y: number;
    metadata?: GraphMetadata;
    /** Structural path-carrier selected from backbone betweenness. */
    isTrunk?: boolean;
    /** Zero-based backbone-betweenness priority among selected trunks. */
    trunkRank?: number;
    /** Present only when this node represents a collapsed community. */
    collapsedCommunity?: string;
    /** Present only when this node summarises a deep layout subtree. */
    collapsedSubtree?: string;
    memberIds?: readonly string[];
}
export interface ShapedGraphEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    weight: number;
    color: GraphColorToken;
    metadata?: GraphMetadata;
}
export interface ShapedGraphData {
    nodes: readonly ShapedGraphNode[];
    edges: readonly ShapedGraphEdge[];
}
export interface FocusedGraphNode extends ShapedGraphNode {
    scale: number;
    showLabel: boolean;
}
export interface FocusedGraphEdge extends ShapedGraphEdge {
    displayLabel: string | undefined;
}
export interface FocusedGraphData {
    nodes: readonly FocusedGraphNode[];
    edges: readonly FocusedGraphEdge[];
}
export interface GraphFocusViewport {
    width: number;
    height: number;
    padding?: number;
    /** Minimum clear space retained while focus scales node circles. */
    nodeMargin?: number;
}
export interface GraphCommunity {
    id: string;
    label: string;
    color: GraphColorToken;
    nodes: readonly ShapedGraphNode[];
}
export interface GraphPoint {
    x: number;
    y: number;
}
export interface GraphInteraction {
    kind: "node" | "edge";
    action: "click" | "focus";
    id: string;
    metadata?: GraphMetadata;
}
export interface GraphCentralityLayoutOptions {
    /** Stable integer used to rotate and order otherwise equivalent branches. */
    seed?: number;
    /** Override automatic centrality-based hub selection for a known topology. */
    hubCount?: number;
}
export interface GraphCentralityLayout {
    data: ShapedGraphData;
    hubs: readonly string[];
    parentByNode: Readonly<Record<string, string | null>>;
    childrenByNode: Readonly<Record<string, readonly string[]>>;
}
export interface GraphCentralityPartitionWork {
    edgeVisits: number;
    queuePushes: number;
    queuePops: number;
}
export interface GraphCentralityPartition {
    parentByNode: Readonly<Record<string, string | null>>;
    childrenByNode: Readonly<Record<string, readonly string[]>>;
    ownerByNode: Readonly<Record<string, string>>;
    work: GraphCentralityPartitionWork;
}
export interface GraphSparseStressLayoutOptions {
    /** Stable integer used for pivot selection and pair shuffling. */
    seed?: number;
    /** Override the centrality-forest hub count used for initialisation. */
    hubCount?: number;
    /** Number of max-min pivots. Defaults to at most 32 and O(sqrt(nodes)). */
    pivotCount?: number;
    /** Number of exponentially annealed SGD passes over the sparse pair set. */
    epochs?: number;
    /** Render viewport used to keep node radii apart in pixel space. */
    viewport?: GraphFocusViewport;
    /** Minimum clear space between rendered node circles. */
    nodeMargin?: number;
}
export interface GraphSparseStressLayout {
    data: ShapedGraphData;
    pivots: readonly string[];
    epochs: number;
    pairCount: number;
    parentByNode: Readonly<Record<string, string | null>>;
    childrenByNode: Readonly<Record<string, readonly string[]>>;
}
export interface GraphLevelOfDetailOptions extends GraphFocusViewport {
    /** Subtree roots whose summary nodes have been expanded by the user. */
    expandedSubtrees?: Iterable<string>;
}
export interface GraphLevelOfDetailProfile {
    nodeLimit: number;
    nodeScale: number;
    radiusStep: number;
    labelLimit: number;
}
export interface GraphLevelOfDetail extends GraphLevelOfDetailProfile {
    data: ShapedGraphData;
    sourceNodeCount: number;
}
export interface GraphCommunityDetectionOptions {
    /** Stable integer used by Leiden when visiting equivalent candidates. */
    seed?: number;
}
export interface GraphBackboneOptions {
    /** Disparity-filter significance threshold. Defaults to 0.5. */
    alpha?: number;
}
export interface GraphBetweennessOptions {
    /** Stable integer used to sample source nodes. */
    seed?: number;
    /** Brandes source count. Small graphs default to exact ranking. */
    sampleSize?: number;
}
export interface GraphBetweennessRank {
    id: string;
    score: number;
}
export interface GraphStructureAnalysisOptions extends GraphBackboneOptions, GraphBetweennessOptions {
}
export interface GraphStructureAnalysis {
    data: ShapedGraphData;
    backbone: ShapedGraphData;
    ranking: readonly GraphBetweennessRank[];
    trunks: readonly string[];
}
/**
 * Copy caller data into the minimal immutable shape shared by SVG and Sigma.
 * Missing positions use a deterministic circle so the first paint is stable.
 */
export declare function shapeGraphData(data: GraphData): ShapedGraphData;
/** Partition a weighted graph between ranked hubs with a binary min-heap. */
export declare function partitionGraphByCentrality(data: ShapedGraphData, hubs: readonly string[], options?: Pick<GraphCentralityLayoutOptions, "seed">): GraphCentralityPartition;
/**
 * Seed a hub-first spanning forest. Hubs occupy a wide outer ring while each
 * weighted subtree receives a non-overlapping angular sector around its hub.
 * The result is pure and deterministic, so SVG and the lazy engine start from
 * exactly the same topology-aware positions.
 */
export declare function layoutGraphByCentrality(data: ShapedGraphData, options?: GraphCentralityLayoutOptions): GraphCentralityLayout;
/**
 * Detect well-connected communities with Leiden while preserving caller-owned
 * communities. Detected identities and colors are stable for a fixed seed.
 */
export declare function detectGraphCommunities(data: ShapedGraphData, options?: GraphCommunityDetectionOptions): ShapedGraphData;
/**
 * Extract Serrano et al.'s multiscale backbone. An undirected edge survives
 * when its normalised weight is significant for at least one endpoint.
 */
export declare function filterGraphBackbone(data: ShapedGraphData, options?: GraphBackboneOptions): ShapedGraphData;
/** Rank nodes by sampled Brandes betweenness over an undirected graph. */
export declare function rankGraphByBetweenness(data: ShapedGraphData, options?: GraphBetweennessOptions): readonly GraphBetweennessRank[];
/**
 * Run the structural pipeline used by layout and visual hierarchy. Trunk
 * count follows Leiden's community count rather than a fixed presentation cap.
 */
export declare function analyseGraphStructure(data: ShapedGraphData, options?: GraphStructureAnalysisOptions): GraphStructureAnalysis;
/**
 * Sparse stress minimisation by stochastic gradient descent. Max-min pivots
 * provide O(kN) target pairs, while the centrality forest supplies the stable
 * topology-aware starting position.
 */
export declare function layoutGraphBySparseStress(data: ShapedGraphData, options?: GraphSparseStressLayoutOptions): GraphSparseStressLayout;
/** Derive graph density from usable canvas area and the nodes' rendered radii. */
export declare function deriveGraphLevelOfDetail(data: ShapedGraphData, viewport: GraphFocusViewport): GraphLevelOfDetailProfile;
/**
 * Apply a canvas-derived level of detail to positioned data. The deepest
 * complete frontier that fits stays visible; descendants become expandable
 * summary nodes without changing the positions owned by sparse-stress layout.
 */
export declare function applyGraphLevelOfDetail(data: ShapedGraphData, parentByNode: Readonly<Record<string, string | null>>, options: GraphLevelOfDetailOptions): GraphLevelOfDetail;
/** Ratio of overlapping node pairs to visible nodes in a fixed viewport. */
export declare function countGraphNodeOverlapRatio(data: ShapedGraphData, viewport: GraphFocusViewport): number;
/** Scale-independent Kruskal stress over all reachable node pairs. */
export declare function graphNormalizedStress(data: ShapedGraphData): number;
/** Replace selected communities with one deterministic, member-sized node. */
export declare function collapseGraphCommunities(data: ShapedGraphData, collapsedCommunities: Iterable<string>): ShapedGraphData;
/** Count straight-line edge crossings for a positioned graph. */
export declare function countGraphEdgeCrossings(data: ShapedGraphData): number;
/** Group nodes without sorting or mutating them; first appearance determines palette order. */
export declare function groupGraphCommunities(nodes: readonly ShapedGraphNode[]): readonly GraphCommunity[];
/** Case-insensitive focus/search over the visible node contract. */
export declare function searchGraphNodes(nodes: readonly ShapedGraphNode[], query: string): readonly ShapedGraphNode[];
/** Derive focus emphasis without mutating the stable graph data. */
export declare function reduceGraphFocus(data: ShapedGraphData, focusedNode: string | null, pulse?: number, viewport?: GraphFocusViewport): FocusedGraphData;
/** Deterministic arrangement selected by the graph contract. */
export type GraphLayout = "stress" | "force" | "radial";
