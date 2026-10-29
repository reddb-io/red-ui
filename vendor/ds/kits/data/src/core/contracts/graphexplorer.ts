import type {
  GraphData,
  GraphNode,
  GraphQueryRequest,
} from "../../graph-explorer";
/** Portable graph exploration. The host owns navigation, queries and authorization. */
export interface GraphExplorerContract {
  /** Accessible graph name. */
  label: string;
  /** Nodes, edges and original opaque metadata. */
  data: GraphData;
  /** Dataset identity. A change cancels pending queries and resets selection. */
  context?: string;
  /** Caller-reported error, distinguished from an empty graph. */
  error?: string | null;
  /** Distinguish valid empty data from an incompatible source envelope. */
  emptyReason?: "empty" | "unsupported";
  /** Optional host route for inspecting an empty or unsupported result another way. */
  recoveryHref?: string;
  /** Label of the recovery destination. Defaults to Inspect data. */
  recoveryLabel?: string;
  /** Initial representation. SVG supports constrained browsers and deterministic previews. */
  initialView?: "canvas" | "svg" | "table";
  /** Resolves a query intent to data. Reject on failure; honor the cancellation signal. */
  onquery?: (
    request: GraphQueryRequest,
    signal: AbortSignal,
  ) => Promise<GraphData>;
  /** Optional host navigation destination for the selected node. */
  nodehref?: (node: GraphNode) => string | undefined;
}
