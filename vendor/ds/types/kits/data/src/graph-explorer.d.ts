import type { GraphData as CanonicalGraphData } from "./graph";
export interface GraphNode {
    id: string;
    label: string;
    /** Full underlying row/object — surfaced when the user clicks a node. */
    data: Record<string, unknown>;
}
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
    /** Full underlying row/object — surfaced when the user clicks an edge. */
    data?: Record<string, unknown>;
}
export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
    /** Host-reported result context, announced after an algorithm query. */
    summary?: string;
}
export interface GraphNodeCentrality {
    degree: number;
    inDegree: number;
    outDegree: number;
    score: number;
}
export type GraphEdgeKind = "imports" | "defines" | "references";
export interface GraphNodeRelation {
    id: string;
    kind: GraphEdgeKind;
    direction: "incoming" | "outgoing";
    label: string;
    edgeLabel?: string;
    nodeId: string;
    nodeLabel: string;
}
export interface GraphNodeDetail {
    description: string | null;
    exports: string[];
    orphan: boolean;
    incoming: GraphNodeRelation[];
    outgoing: GraphNodeRelation[];
    whereUsed: GraphNodeRelation[];
}
export declare function graphNodeDescription(node: GraphNode): string | null;
export declare function graphNodeExports(node: GraphNode): string[];
export declare function graphNodeIsOrphan(node: GraphNode, centrality?: Map<string, GraphNodeCentrality>): boolean;
export declare function graphNodeDetail(node: GraphNode, nodes: GraphNode[], edges: GraphEdge[], centrality?: Map<string, GraphNodeCentrality>): GraphNodeDetail;
export declare function graphNodeCentrality(nodes: GraphNode[], edges: GraphEdge[]): Map<string, GraphNodeCentrality>;
export declare function compareGraphNodesByCentrality(a: GraphNode, b: GraphNode, centrality: Map<string, GraphNodeCentrality>): number;
export declare function graphNodeIncomingSizeScales(nodes: GraphNode[], centrality: Map<string, GraphNodeCentrality>): Map<string, number>;
export declare function renderGraphSnapshot(graph: GraphData): string;
/** Opaque node metadata remains caller-owned when sent to the canonical Graph. */
export declare function explorerGraphData(graph: GraphData): CanonicalGraphData;
export declare function filterExplorerGraph(graph: GraphData, filter: string, hiddenTypes: ReadonlySet<string>, limit?: number): GraphData;
export type GraphQueryRequest = {
    kind: "query";
    query: string;
} | {
    kind: "neighborhood";
    node: string;
} | {
    kind: "centrality";
} | {
    kind: "path";
    from: string;
    to: string;
};
export declare function graphExplorerTypes(graph: GraphData): string[];
/** The adapter may provide the database discriminator or a generic type. */
export declare function graphExplorerNodeType(node: GraphNode): string;
