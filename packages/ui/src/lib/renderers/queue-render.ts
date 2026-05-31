import type { QueryResult } from '#reddb'

export interface QueueMessage {
  index: number
  id: string
  messageColumn: string | null
  message: unknown
  state: string
  consumer: string | null
  dlc: string | null
  values: Record<string, unknown>
}

export interface QueueEvent {
  messageId: string
  collection: string
  op: string
  entityId: string
  lsn: number | null
  ts: number | null
  before: unknown
  after: unknown
  payload: Record<string, unknown>
}

export interface QueueCommand {
  label: string
  query: string
  mutates: boolean
  note: string
}

const MESSAGE_COLUMNS = ['message', 'payload', 'body', 'value', 'data']
const STATE_COLUMNS = ['state', 'status', 'delivery_state']
const CONSUMER_COLUMNS = ['consumer', 'consumer_id', 'worker', 'lease_owner']
const DLC_COLUMNS = ['dlc', 'dlq', 'dead_letter_collection', 'dead_letter_queue']

function pick(values: Record<string, unknown>, names: string[]): [string, unknown] | null {
  for (const name of names) {
    if (name in values) return [name, values[name]]
  }
  const lowered = Object.entries(values).find(([k]) => names.includes(k.toLowerCase()))
  return lowered ?? null
}

export function extractQueueMessages(result: QueryResult): QueueMessage[] {
  return result.result.records.map((record, index) => {
    const values = record.values ?? {}
    const message = pick(values, MESSAGE_COLUMNS)
    const state = pick(values, STATE_COLUMNS)
    const consumer = pick(values, CONSUMER_COLUMNS)
    const dlc = pick(values, DLC_COLUMNS)
    return {
      index,
      id: String(values.message_id ?? values.id ?? values.rid ?? index + 1),
      messageColumn: message?.[0] ?? null,
      message: message?.[1] ?? values,
      state: String(state?.[1] ?? 'ready'),
      consumer: consumer?.[1] === undefined || consumer?.[1] === null ? null : String(consumer[1]),
      dlc: dlc?.[1] === undefined || dlc?.[1] === null ? null : String(dlc[1]),
      values,
    }
  })
}

export function hasQueueShape(result: QueryResult): boolean {
  if (result.capability === 'queue') return true
  return result.result.records.some((record) => {
    const keys = Object.keys(record.values ?? {}).map((k) => k.toLowerCase())
    if (keys.includes('message_id') && MESSAGE_COLUMNS.some((c) => keys.includes(c))) return true
    return MESSAGE_COLUMNS.some((c) => keys.includes(c)) && (
      STATE_COLUMNS.some((c) => keys.includes(c)) ||
      CONSUMER_COLUMNS.some((c) => keys.includes(c)) ||
      DLC_COLUMNS.some((c) => keys.includes(c))
    )
  })
}

export function queueSummary(messages: QueueMessage[]) {
  const active = new Set<string>()
  const states = new Map<string, number>()
  const dlcs = new Set<string>()
  const operations = new Map<string, number>()
  const sources = new Set<string>()
  for (const msg of messages) {
    states.set(msg.state, (states.get(msg.state) ?? 0) + 1)
    if (msg.consumer && /active|leased|processing|running/i.test(msg.state)) active.add(msg.consumer)
    if (msg.dlc) dlcs.add(msg.dlc)
    if (msg.message && typeof msg.message === 'object' && !Array.isArray(msg.message)) {
      const payload = msg.message as Record<string, unknown>
      const op = payload.op
      const source = payload.collection
      if (typeof op === 'string') operations.set(op, (operations.get(op) ?? 0) + 1)
      if (typeof source === 'string') sources.add(source)
    }
  }
  return {
    activeConsumers: active.size,
    states: [...states.entries()],
    dlcs: [...dlcs],
    operations: [...operations.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    sources: [...sources].sort(),
  }
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}

export function extractQueueEvents(messages: QueueMessage[]): QueueEvent[] {
  const events: QueueEvent[] = []
  for (const msg of messages) {
    if (!msg.message || typeof msg.message !== 'object' || Array.isArray(msg.message)) continue
    const payload = msg.message as Record<string, unknown>
    const collection = payload.collection
    const op = payload.op
    if (typeof collection !== 'string' || typeof op !== 'string') continue
    const id = payload.id ?? (payload.after && typeof payload.after === 'object' && !Array.isArray(payload.after)
      ? (payload.after as Record<string, unknown>).id
      : undefined)
    events.push({
      messageId: msg.id,
      collection,
      op,
      entityId: id === undefined || id === null ? String(payload.rid ?? msg.id) : String(id),
      lsn: numberOrNull(payload.lsn),
      ts: numberOrNull(payload.ts),
      before: payload.before,
      after: payload.after,
      payload,
    })
  }
  return events
}

export function queueCommandPlan(queue: string): QueueCommand[] {
  const safeQueue = queue.replace(/[^A-Za-z0-9_./-]/g, '')
  const consumer = 'red-ui-preview'
  const group = 'showcase'
  return [
    {
      label: 'Backlog depth',
      query: `QUEUE LEN ${safeQueue}`,
      mutates: false,
      note: 'Read-only count of messages currently stored in the queue.',
    },
    {
      label: 'Peek messages',
      query: `QUEUE PEEK ${safeQueue} 25`,
      mutates: false,
      note: 'Read-only inspection. Does not lease, ack, or remove messages.',
    },
    {
      label: 'Read as fanout consumer',
      query: `QUEUE READ ${safeQueue} CONSUMER ${consumer} COUNT 5`,
      mutates: true,
      note: 'Leases messages for this consumer. ACK/NACK decides what happens next.',
    },
    {
      label: 'Read through explicit group',
      query: `QUEUE READ ${safeQueue} GROUP ${group} CONSUMER worker-a COUNT 5`,
      mutates: true,
      note: 'Creates/uses consumer group delivery state for an application tier.',
    },
    {
      label: 'Inspect pending group messages',
      query: `QUEUE PENDING ${safeQueue} GROUP ${group}`,
      mutates: false,
      note: 'Shows leased-but-unacked messages for a group.',
    },
    {
      label: 'Ack a delivered message',
      query: `QUEUE ACK ${safeQueue} GROUP ${group} 'message-id'`,
      mutates: true,
      note: 'Removes a successfully processed message for that group.',
    },
    {
      label: 'Nack a delivered message',
      query: `QUEUE NACK ${safeQueue} GROUP ${group} 'message-id'`,
      mutates: true,
      note: 'Returns or retries a failed message according to queue policy.',
    },
  ]
}

export function queuePushQuery(queue: string, payload: unknown): string {
  const safeQueue = queue.replace(/[^A-Za-z0-9_./-]/g, '')
  const rendered = typeof payload === 'string'
    ? `'${payload.replace(/'/g, "''")}'`
    : JSON.stringify(payload ?? null)
  return `QUEUE PUSH ${safeQueue} ${rendered}`
}
