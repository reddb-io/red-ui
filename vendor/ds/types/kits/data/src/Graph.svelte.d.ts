export { GRAPH_COLOR_TOKENS, GRAPH_EDGE_LABEL_MAX_LENGTH, GRAPH_EDGE_COLOR_TOKEN, GRAPH_FOCUSED_SCALE, GRAPH_FOCUS_PULSE_SCALE, GRAPH_ENGINE_STAGE_PADDING, GRAPH_LAYOUT_GRAVITY, GRAPH_LAYOUT_ITERATIONS_PER_NODE, GRAPH_LAYOUT_MAX_ITERATIONS, GRAPH_LAYOUT_MIN_AXIS_FILL, GRAPH_LAYOUT_MIN_ITERATIONS, GRAPH_LAYOUT_SCALING_RATIO, GRAPH_MUTED_COLOR_TOKEN, GRAPH_NEIGHBOUR_LABEL_LIMIT, GRAPH_NEIGHBOUR_SCALE, GRAPH_REST_SCALE, GRAPH_SUPERNODE_BASE_SIZE, GRAPH_SUPERNODE_MEMBER_SCALE, analyseGraphStructure, applyGraphLevelOfDetail, collapseGraphCommunities, countGraphEdgeCrossings, countGraphNodeOverlapRatio, deriveGraphLevelOfDetail, detectGraphCommunities, filterGraphBackbone, graphNormalizedStress, groupGraphCommunities, layoutGraphByCentrality, layoutGraphBySparseStress, partitionGraphByCentrality, rankGraphByBetweenness, reduceGraphFocus, searchGraphNodes, shapeGraphData, } from "./graph";
export type { GraphColorToken, GraphBackboneOptions, GraphBetweennessOptions, GraphBetweennessRank, GraphCentralityLayout, GraphCentralityLayoutOptions, GraphCommunity, GraphCommunityDetectionOptions, GraphData, GraphEdge, GraphInteraction, GraphLevelOfDetail, GraphLevelOfDetailOptions, GraphLevelOfDetailProfile, GraphMetadata, GraphPoint, GraphCentralityPartition, GraphCentralityPartitionWork, GraphSparseStressLayout, GraphSparseStressLayoutOptions, GraphStructureAnalysis, GraphStructureAnalysisOptions, FocusedGraphData, FocusedGraphEdge, FocusedGraphNode, GraphFocusViewport, GraphNode, ShapedGraphData, ShapedGraphEdge, ShapedGraphNode, } from "./graph";
export type GraphLayout = "stress" | "force" | "radial";
import type { GraphContract } from "./core/contracts/graph";
import { type GraphInteraction } from "./graph";
interface Props extends GraphContract {
    /** Reports the focused node id after focus moves to a node, or clears. */
    onfocusednodechange?: (id: string | null) => void;
    /** @deprecated Renamed `onfocusednodechange` (ADR 0026); removed next release. */
    onFocusedNode?: (id: string | null) => void;
    /** Reports the still-collapsed communities after one expands. */
    oncollapsedcommunitieschange?: (communities: readonly string[]) => void;
    /** @deprecated Renamed `oncollapsedcommunitieschange` (ADR 0026); removed next release. */
    onCollapsedCommunitiesChange?: (communities: readonly string[]) => void;
    /** A discrete event: every click and keyboard focus on a node or edge, caller metadata intact. */
    oninteraction?: (interaction: GraphInteraction) => void;
    /** @deprecated Renamed `oninteraction` (ADR 0026); removed next release. */
    onInteraction?: (interaction: GraphInteraction) => void;
    /** Extra classes, merged onto the root element that holds the search field and the drawing. */
    class?: string;
}
declare const Graph: import("svelte").Component<Props, {}, "">;
type Graph = ReturnType<typeof Graph>;
export default Graph;
