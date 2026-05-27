import { describe, expect, it, vi } from 'vitest'
import { capabilityFromCatalogModel, detectCapability, pickCapability, tagsFromCollectionMetadata } from './capability'
import type { CollectionMetadata, QueryResult, RedClient } from '@red-ui/protocol'

function result(capability: string | undefined, records: QueryResult['result']['records'] = []): QueryResult {
  return {
    ok: true,
    query: '',
    capability,
    record_count: records.length,
    result: { columns: [], records },
  }
}

describe('collection capability detection', () => {
  it('prioritizes specific capability tags over table', () => {
    expect(pickCapability(['table', 'vector'])).toBe('vector')
    expect(pickCapability(['structured', 'timeseries'])).toBe('hypertable')
  })

  it('extracts tags from collection metadata', () => {
    const meta: CollectionMetadata = {
      name: 'events',
      kind: 'table',
      capability: 'stats',
      capabilities: ['document'],
      schema: { capability: 'queue', kind: 'structured' },
    }
    expect(tagsFromCollectionMetadata(meta)).toEqual([
      'table',
      'stats',
      'document',
      'structured',
      'queue',
    ])
  })

  it('maps red.collections models to UI capabilities', () => {
    expect(capabilityFromCatalogModel('graph')).toBe('graph')
    expect(capabilityFromCatalogModel('time_series')).toBe('hypertable')
    expect(capabilityFromCatalogModel('queue')).toBe('queue')
    expect(capabilityFromCatalogModel('kv')).toBe('kv')
    expect(capabilityFromCatalogModel('vector')).toBe('vector')
    expect(capabilityFromCatalogModel('document')).toBe('document')
    expect(capabilityFromCatalogModel('hll')).toBe('stats')
    expect(capabilityFromCatalogModel('sketch')).toBe('stats')
    expect(capabilityFromCatalogModel('filter')).toBe('stats')
    expect(capabilityFromCatalogModel('table')).toBe('table')
  })

  it('can use metadata before probing rows, so empty typed collections work when requested', async () => {
    const client = {
      collection: vi.fn(async () => ({ name: 'embeddings', kind: 'vector' })),
      query: vi.fn(async () => result(undefined)),
    } as unknown as RedClient

    await expect(detectCapability(client, 'embeddings', { useMetadata: true })).resolves.toBe('vector')
    expect(client.query).not.toHaveBeenCalled()
  })

  it('uses row probing by default to avoid noisy metadata 404s on older servers', async () => {
    const client = {
      collection: vi.fn(async () => { throw new Error('404') }),
      query: vi.fn(async (sql: string) => {
        if (sql.includes('red.collections')) throw new Error('missing catalog')
        return result(undefined, [
          { values: { red_capabilities: 'queue table' } },
        ])
      }),
    } as unknown as RedClient

    await expect(detectCapability(client, 'jobs')).resolves.toBe('queue')
    expect(client.collection).not.toHaveBeenCalled()
  })

  it('falls back to row probing when requested metadata is unavailable', async () => {
    const client = {
      collection: vi.fn(async () => { throw new Error('404') }),
      query: vi.fn(async (sql: string) => {
        if (sql.includes('red.collections')) throw new Error('missing catalog')
        return result(undefined, [
          { values: { red_capabilities: 'queue table' } },
        ])
      }),
    } as unknown as RedClient

    await expect(detectCapability(client, 'jobs', { useMetadata: true })).resolves.toBe('queue')
  })

  it('uses red.collections catalog model when row scans would be empty', async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('red.collections')) {
          return {
            ...result(undefined),
            result: { columns: ['model'], records: [{ values: { model: 'queue' } }] },
          }
        }
        return result(undefined, [])
      }),
    } as unknown as RedClient

    await expect(detectCapability(client, 'events')).resolves.toBe('queue')
  })

  it('infers native KV rows from key/value shape when the server reports table', async () => {
    const client = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['key', 'value', 'kind'],
          records: [{ values: { key: 'app/feature/graph', value: true, kind: 'kv' } }],
        },
      })),
    } as unknown as RedClient

    await expect(detectCapability(client, 'settings')).resolves.toBe('kv')
  })

  it('infers timeseries before generic metric stats', async () => {
    const client = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['timestamp', 'metric', 'value'],
          records: [{ values: { timestamp: 1, metric: 'queue.enqueue', value: 2 } }],
        },
      })),
    } as unknown as RedClient

    await expect(detectCapability(client, 'ingest_log')).resolves.toBe('hypertable')
  })

  it('infers queue and stats shapes from probe rows', async () => {
    const queueClient = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['message_id', 'payload'],
          records: [{ values: { message_id: 'm1', payload: { op: 'insert' } } }],
        },
      })),
    } as unknown as RedClient
    const statsClient = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['table', 'row_count', 'page_count'],
          records: [{ values: { table: 'tales', row_count: 25, page_count: 1 } }],
        },
      })),
    } as unknown as RedClient

    await expect(detectCapability(queueClient, 'events')).resolves.toBe('queue')
    await expect(detectCapability(statsClient, 'red_stats')).resolves.toBe('stats')
  })

  it('infers diff shape from before/after rows', async () => {
    const client = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['change', 'entity_id', 'before_state', 'after_state'],
          records: [{ values: { change: 'modified', entity_id: 'cinderella', before_state: '{}', after_state: '{}' } }],
        },
      })),
    } as unknown as RedClient

    await expect(detectCapability(client, 'grimm_branch_diff')).resolves.toBe('diff')
  })

  it('infers document shape from document rows', async () => {
    const client = {
      query: vi.fn(async () => ({
        ...result(undefined),
        result: {
          columns: ['rid', 'kind', 'body', 'title'],
          records: [{ values: { rid: 1, kind: 'document', body: { title: 'Runbook' }, title: 'Runbook' } }],
        },
      })),
    } as unknown as RedClient

    await expect(detectCapability(client, 'grimm_runbooks')).resolves.toBe('document')
  })

  it('falls back to probabilistic info commands when SELECT probing fails', async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('red.collections')) {
          return {
            ...result(undefined),
            result: { columns: ['model'], records: [{ values: { model: 'mixed' } }] },
          }
        }
        if (sql.startsWith('SELECT *')) throw new Error('probabilistic collection supports read forms')
        if (sql.startsWith('HLL INFO')) throw new Error('not hll')
        if (sql.startsWith('SKETCH INFO')) throw new Error('not sketch')
        return result(undefined, [{ values: { name: 'seen', count: 3 } }])
      }),
    } as unknown as RedClient

    await expect(detectCapability(client, 'grimm_seen_sessions')).resolves.toBe('stats')
  })

  it('checks probabilistic read forms for mixed catalog models before accepting an empty table probe', async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('red.collections')) {
          return {
            ...result(undefined),
            result: { columns: ['model'], records: [{ values: { model: 'mixed' } }] },
          }
        }
        if (sql.startsWith('HLL INFO')) throw new Error('not hll')
        if (sql.startsWith('SKETCH INFO')) throw new Error('not sketch')
        if (sql.startsWith('FILTER INFO')) return result(undefined, [{ values: { name: 'seen', count: 3 } }])
        return result(undefined, [])
      }),
    } as unknown as RedClient

    await expect(detectCapability(client, 'grimm_seen_sessions')).resolves.toBe('stats')
    expect(client.query).not.toHaveBeenCalledWith('SELECT * FROM grimm_seen_sessions LIMIT 1')
  })
})
