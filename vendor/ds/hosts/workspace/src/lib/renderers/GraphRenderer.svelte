<script lang="ts">
  import type { QueryResult } from '../reddb/index'
  import GraphExplorer from '@reddb-io/design-system/data/GraphExplorer'
  import type { GraphQueryRequest } from '@reddb-io/design-system/data/graph-explorer'
  import { extractGraph, graphQuery, graphQueryResult } from '@reddb-io/design-system/adapters/reddb/graph-results'
  import { collectionPageHref } from '../collection-pages'
  import { useWorkspace } from '../workspace-context'

  const { activity, connection } = useWorkspace()
  let { result, collection, subpage }: {
    result: QueryResult
    collection?: string
    subpage?: string
    showSystem?: boolean
  } = $props()
  const data = $derived(extractGraph(result))
  const initialView = $derived(subpage === 'svg' ? 'svg' : subpage === 'table' ? 'table' : 'canvas')

  async function query(request: GraphQueryRequest, signal: AbortSignal) {
    const client = connection.client
    if (!client) throw new Error('No active RedDB connection.')
    const sql = graphQuery(request)
    const next = await activity.track(`${collection ?? 'graph'} · ${sql}`, () => client.query(sql, { signal }))
    if (!next.ok) throw new Error(next.error ?? 'Graph query failed.')
    return graphQueryResult(next, data)
  }
</script>

<div data-renderer="graph" class="h-full min-h-0">
  {#key initialView}
    <GraphExplorer label="Graph result" {data} context={collection} {initialView}
      emptyReason={result.result.records.length && !data.nodes.length ? "unsupported" : "empty"}
      recoveryHref={collection ? collectionPageHref(collection, "table") : undefined} recoveryLabel="View as table"
      error={!result.ok ? result.error ?? 'Graph query failed.' : undefined}
      onquery={connection.client ? query : undefined} />
  {/key}
</div>
