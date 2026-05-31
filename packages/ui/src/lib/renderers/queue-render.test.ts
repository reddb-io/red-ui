import { describe, expect, it } from 'vitest'
import type { QueryResult } from '#reddb'
import { extractQueueEvents, extractQueueMessages, hasQueueShape, queueCommandPlan, queuePushQuery, queueSummary } from './queue-render'

function result(records: QueryResult['result']['records'], capability?: string): QueryResult {
  return { ok: true, query: '', capability, record_count: records.length, result: { columns: [], records } }
}

describe('queue renderer helpers', () => {
  it('extracts message state, consumer, and dead-letter link', () => {
    const messages = extractQueueMessages(result([
      { values: { id: 'm1', payload: { event: 'signup' }, state: 'active', consumer_id: 'c1', dlq: 'jobs_dlq' } },
    ]))
    expect(messages[0]).toMatchObject({
      id: 'm1',
      messageColumn: 'payload',
      message: { event: 'signup' },
      state: 'active',
      consumer: 'c1',
      dlc: 'jobs_dlq',
    })
  })

  it('accepts native QUEUE PEEK rows', () => {
    const r = result([
      { values: { message_id: '51022', payload: { collection: 'tale_reviews', op: 'insert' } } },
    ])
    const messages = extractQueueMessages(r)
    expect(messages[0]).toMatchObject({
      id: '51022',
      messageColumn: 'payload',
      message: { collection: 'tale_reviews', op: 'insert' },
      state: 'ready',
    })
    expect(hasQueueShape(r)).toBe(true)
  })

  it('summarizes active consumers and dlc relationships', () => {
    const summary = queueSummary(extractQueueMessages(result([
      { values: { id: 'm1', message: { collection: 'reviews', op: 'insert' }, state: 'active', consumer: 'c1', dlc: 'dead' } },
      { values: { id: 'm2', message: 'b', state: 'ready', consumer: 'c2', dlc: 'dead' } },
    ])))
    expect(summary.activeConsumers).toBe(1)
    expect(summary.dlcs).toEqual(['dead'])
    expect(summary.operations).toEqual([['insert', 1]])
    expect(summary.sources).toEqual(['reviews'])
    expect(hasQueueShape(result([], 'queue'))).toBe(true)
  })

  it('builds native queue push SQL for JSON and string payloads', () => {
    expect(queuePushQuery('jobs', { job: 'ship', id: 1 })).toBe('QUEUE PUSH jobs {"job":"ship","id":1}')
    expect(queuePushQuery('jobs', "it's ready")).toBe("QUEUE PUSH jobs 'it''s ready'")
  })

  it('extracts event envelopes emitted by WITH EVENTS queues', () => {
    const events = extractQueueEvents(extractQueueMessages(result([
      {
        values: {
          message_id: '203755',
          payload: {
            collection: 'tale_reviews',
            op: 'insert',
            id: 'rv-001',
            lsn: 203502,
            ts: 1779910021532,
            before: null,
            after: { id: 'rv-001', rating: 5 },
          },
        },
      },
    ])))

    expect(events[0]).toMatchObject({
      messageId: '203755',
      collection: 'tale_reviews',
      op: 'insert',
      entityId: 'rv-001',
      lsn: 203502,
      ts: 1779910021532,
      after: { id: 'rv-001', rating: 5 },
    })
  })

  it('builds a queue command plan with read-only and mutating operations', () => {
    const commands = queueCommandPlan('grimm_events')
    expect(commands.find((c) => c.query === 'QUEUE PEEK grimm_events 25')?.mutates).toBe(false)
    expect(commands.some((c) => c.query.includes('QUEUE READ grimm_events') && c.mutates)).toBe(true)
    expect(commands.some((c) => c.query.includes('QUEUE ACK grimm_events'))).toBe(true)
  })
})
