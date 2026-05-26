/**
 * Bulk-ingest the case-grimm corpus into a reddb graph collection via the
 * SQL surface only (POST /query). Reuses case-grimm's YAML loader so the
 * source of truth stays in one place; replaces case-grimm's embedded SDK
 * (`@reddb-io/sdk`, which rejects http:// URIs) with raw fetch so we can
 * point at any HTTP-reachable reddb (local docker, fly.io tunnel, etc.).
 *
 * Usage:
 *   pnpm exec tsx scripts/ingest-grimm.ts <connection-string>
 *
 *   connection-string accepts http(s)://host:port, red(s)://host[:port], or
 *   bare host:port — same shapes as the red-ui dropdown.
 */
import { loadGraph } from '../../case-grimm/src/shared/load-graph.ts'
import {
  nodeInsertBatches,
  edgeInsertBatches,
  insertSql,
  type EntityId,
} from '../../case-grimm/src/shared/graph-sql.ts'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const COLLECTION = 'grimm_graph'
const NODE_CHUNK = 100
const EDGE_CHUNK = 50

// ─── arg + url normalization ────────────────────────────────────────────────

function normalizeUrl(raw: string): string {
  const t = raw.replace(/\/$/, '')
  if (t.startsWith('red://')) return `http://${t.slice('red://'.length)}:5055`
  if (t.startsWith('reds://')) return `https://${t.slice('reds://'.length)}:5055`
  if (t.startsWith('http://') || t.startsWith('https://')) return t
  return `http://${t}`
}

const argUrl = process.argv[2] ?? 'http://localhost:15055'
const BASE = normalizeUrl(argUrl)

// ─── sql transport ──────────────────────────────────────────────────────────

interface RedRecord { values: Record<string, unknown> }
interface RedResult {
  ok: boolean
  error?: string
  result?: { columns: string[]; records: RedRecord[] }
}

async function sql(query: string, { tolerant = false } = {}): Promise<RedResult> {
  const res = await fetch(`${BASE}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const body = (await res.json()) as RedResult
  if (!body.ok && !tolerant) {
    throw new Error(`sql failed: ${body.error ?? 'unknown'}\n  query head: ${query.slice(0, 240)}`)
  }
  return body
}

// ─── ingest pipeline ────────────────────────────────────────────────────────

async function ensureCollection() {
  await sql(`DROP GRAPH ${COLLECTION}`, { tolerant: true })
  await sql(`CREATE GRAPH ${COLLECTION}`)
}

async function ingestNodes(nodes: ReturnType<typeof loadGraph>['nodes']): Promise<Map<string, EntityId>> {
  const labelToId = new Map<string, EntityId>()
  let inserted = 0
  const t0 = Date.now()

  for (const group of nodeInsertBatches(nodes)) {
    for (let i = 0; i < group.rows.length; i += NODE_CHUNK) {
      const chunk = group.rows.slice(i, i + NODE_CHUNK)
      const stmt =
        insertSql(COLLECTION, 'NODE', group.columns, chunk) + ' RETURNING rid, label'
      const r = await sql(stmt)
      for (const rec of r.result?.records ?? []) {
        const label = rec.values.label as string | undefined
        const rid = rec.values.rid as number | undefined
        if (typeof label === 'string' && typeof rid === 'number') labelToId.set(label, rid)
      }
      inserted += chunk.length
      process.stdout.write(`  nodes: ${inserted}/${nodes.length}\r`)
    }
  }
  console.log(`  nodes: ${inserted}/${nodes.length} (${Date.now() - t0}ms)`)
  return labelToId
}

async function ingestEdges(
  edges: ReturnType<typeof loadGraph>['edges'],
  labelToId: Map<string, EntityId>,
) {
  const { batches, skipped, unresolved } = edgeInsertBatches(edges, labelToId)
  const total = batches.reduce((s, b) => s + b.rows.length, 0)
  if (skipped > 0) {
    const sample = [...unresolved].slice(0, 5).join(', ')
    console.log(`  skipping ${skipped} edges with unresolved endpoints (sample: ${sample})`)
  }
  let inserted = 0
  const t0 = Date.now()
  for (const group of batches) {
    // reddb addresses edge endpoints as from_rid/to_rid; rename case-grimm's
    // `from`/`to` columns to match the server's expected schema.
    const columns = group.columns.map((c) => (c === 'from' ? 'from_rid' : c === 'to' ? 'to_rid' : c))
    for (let i = 0; i < group.rows.length; i += EDGE_CHUNK) {
      const chunk = group.rows.slice(i, i + EDGE_CHUNK)
      const stmt = insertSql(COLLECTION, 'EDGE', columns, chunk.map((row) => {
        const r: Record<string, unknown> = { ...row }
        if ('from' in r) { r.from_rid = r.from; delete r.from }
        if ('to' in r) { r.to_rid = r.to; delete r.to }
        return r as typeof row
      }))
      await sql(stmt)
      inserted += chunk.length
      if (inserted % 500 === 0 || inserted === total) {
        process.stdout.write(`  edges: ${inserted}/${total}\r`)
      }
    }
  }
  console.log(`  edges: ${inserted}/${total} (${Date.now() - t0}ms)`)
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log(`▸ target: ${BASE}`)

  // Resolve case-grimm's input/3-gold relative to this file.
  const here = fileURLToPath(new URL('.', import.meta.url))
  const dataDir = resolve(here, '..', '..', 'case-grimm', 'input')
  console.log(`▸ source: ${dataDir}`)

  const graph = loadGraph(dataDir)
  console.log(`▸ loaded ${graph.nodes.length} nodes / ${graph.edges.length} edges`)

  console.log(`\n▸ CREATE GRAPH ${COLLECTION}`)
  await ensureCollection()

  console.log(`\n▸ INSERT NODE …`)
  const labelToId = await ingestNodes(graph.nodes)

  console.log(`\n▸ INSERT EDGE …`)
  await ingestEdges(graph.edges, labelToId)

  const verify = await sql(`SELECT COUNT(*) FROM ${COLLECTION}`)
  console.log(`\n✓ ${COLLECTION}: ${JSON.stringify(verify.result?.records[0]?.values)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
