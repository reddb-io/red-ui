// Private compatibility helpers delegate to the canonical Data Kit and adapter.
import type { QueryResult } from '../reddb/index'
import { extractGraph } from '@reddb-io/design-system/adapters/reddb/graph-results'
import { renderGraphSnapshot } from '@reddb-io/design-system/data/graph-explorer'
export { extractGraph, hasGraphShape } from '@reddb-io/design-system/adapters/reddb/graph-results'
export { graphNodeCentrality, graphNodeDetail, graphNodeIncomingSizeScales, graphNodeIsOrphan, compareGraphNodesByCentrality } from '@reddb-io/design-system/data/graph-explorer'
export type { GraphData, GraphNode, GraphEdge, GraphNodeRelation } from '@reddb-io/design-system/data/graph-explorer'
export const renderGraphHtml = (result: QueryResult): string => renderGraphSnapshot(extractGraph(result))
