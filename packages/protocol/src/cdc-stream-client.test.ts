import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChangeEvent } from './client'
import {
  CDCStreamClient,
  type EventSourceLike,
  type SseFactory,
} from './cdc-stream-client'

function ev(lsn: number, overrides: Partial<ChangeEvent> = {}): ChangeEvent {
  return {
    lsn,
    timestamp: lsn * 1000,
    collection: 'orders',
    kind: 'orders',
    operation: 'insert',
    ...overrides,
  }
}

class FakeEventSource implements EventSourceLike {
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  onopen: ((ev: unknown) => void) | null = null
  closed = false
  constructor(public url: string) {}
  close() {
    this.closed = true
  }
  emitOpen() {
    this.onopen?.({})
  }
  emit(e: ChangeEvent) {
    this.onmessage?.({ data: JSON.stringify(e) })
  }
  fail() {
    this.onerror?.({})
  }
}

function makeSseFactory(): { factory: SseFactory; instances: FakeEventSource[] } {
  const instances: FakeEventSource[] = []
  const factory: SseFactory = (url) => {
    const es = new FakeEventSource(url)
    instances.push(es)
    return es
  }
  return { factory, instances }
}

async function readN<T>(stream: ReadableStream<T>, n: number): Promise<T[]> {
  const reader = stream.getReader()
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    const { value, done } = await reader.read()
    if (done) break
    out.push(value as T)
  }
  reader.releaseLock()
  return out
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('CDCStreamClient — SSE transport', () => {
  it('delivers events in LSN order through the stream', async () => {
    const { factory, instances } = makeSseFactory()
    const client = new CDCStreamClient({
      client: { changes: vi.fn(), baseUrl: 'http://r' },
      sseFactory: factory,
    })
    const sub = client.subscribe({ collection: 'orders' })
    await vi.runAllTimersAsync() // flush probe
    const es = instances[0]
    expect(es).toBeDefined()
    es.emitOpen()
    es.emit(ev(1))
    es.emit(ev(2))
    es.emit(ev(3))
    const received = await readN(sub.events, 3)
    expect(received.map((e) => e.lsn)).toEqual([1, 2, 3])
    sub.close()
  })

  it('builds SSE URL with collection and since params', () => {
    const client = new CDCStreamClient({
      client: { changes: vi.fn(), baseUrl: 'http://r' },
      sseFactory: () => ({}) as EventSourceLike,
    })
    expect(client.buildSseUrl('orders', 0)).toBe('http://r/changes/stream?collection=orders')
    expect(client.buildSseUrl('orders', 42)).toBe(
      'http://r/changes/stream?since=42&collection=orders',
    )
    expect(client.buildSseUrl(undefined, 0)).toBe('http://r/changes/stream')
  })

  it('deduplicates events by LSN', async () => {
    const { factory, instances } = makeSseFactory()
    const client = new CDCStreamClient({
      client: { changes: vi.fn(), baseUrl: 'http://r' },
      sseFactory: factory,
    })
    const sub = client.subscribe({})
    await vi.runAllTimersAsync()
    const es = instances[0]
    es.emit(ev(1))
    es.emit(ev(2))
    es.emit(ev(2)) // duplicate
    es.emit(ev(1)) // older
    es.emit(ev(3))
    const received = await readN(sub.events, 3)
    expect(received.map((e) => e.lsn)).toEqual([1, 2, 3])
    sub.close()
  })

  it('reconnects after error and resumes from lastSeenLsn (no dupes, no gaps)', async () => {
    const { factory, instances } = makeSseFactory()
    const client = new CDCStreamClient({
      client: { changes: vi.fn(), baseUrl: 'http://r' },
      sseFactory: factory,
      backoffMs: [10],
    })
    const sub = client.subscribe({ collection: 'orders' })
    await vi.runAllTimersAsync()
    const es1 = instances[0]
    es1.emit(ev(5))
    es1.emit(ev(6))
    // Drain so the consumer's lastSeen is at 6.
    const first = await readN(sub.events, 2)
    expect(first.map((e) => e.lsn)).toEqual([5, 6])

    es1.fail()
    expect(es1.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(10)
    const es2 = instances[1]
    expect(es2).toBeDefined()
    // The reconnect URL must carry since=6 (the last delivered LSN).
    expect(es2.url).toContain('since=6')
    es2.emit(ev(6)) // server replay — must be deduped
    es2.emit(ev(7))
    es2.emit(ev(8))
    const next = await readN(sub.events, 2)
    expect(next.map((e) => e.lsn)).toEqual([7, 8])
    sub.close()
  })

  it('close() aborts the EventSource and silences further events', async () => {
    const { factory, instances } = makeSseFactory()
    const client = new CDCStreamClient({
      client: { changes: vi.fn(), baseUrl: 'http://r' },
      sseFactory: factory,
    })
    const sub = client.subscribe({})
    await vi.runAllTimersAsync()
    const es = instances[0]
    sub.close()
    expect(es.closed).toBe(true)
    const reader = sub.events.getReader()
    const { done } = await reader.read()
    expect(done).toBe(true)
  })
})

describe('CDCStreamClient — REST fallback', () => {
  it('falls back to REST polling when SSE probe returns false (e.g. 404)', async () => {
    const changes = vi.fn<[number?], Promise<ChangeEvent[]>>()
    changes.mockResolvedValueOnce([ev(1), ev(2)])
    changes.mockResolvedValueOnce([ev(3)])
    changes.mockResolvedValue([])
    const { factory, instances } = makeSseFactory()
    const client = new CDCStreamClient({
      client: { changes, baseUrl: 'http://r' },
      sseFactory: factory,
      sseProbe: async () => false,
      pollIntervalMs: 100,
    })
    const sub = client.subscribe({})
    // Probe is async, flush microtasks without advancing timers excessively.
    await vi.advanceTimersByTimeAsync(0)
    expect(instances.length).toBe(0) // never opened SSE
    expect(changes).toHaveBeenCalledWith(0)
    // After first poll delivered 1+2, lastSeen=2. Next poll should pass since=2.
    await vi.advanceTimersByTimeAsync(100)
    expect(changes).toHaveBeenCalledWith(2)
    const received = await readN(sub.events, 3)
    expect(received.map((e) => e.lsn)).toEqual([1, 2, 3])
    sub.close()
  })

  it('REST polling reconnects on failure with backoff and resumes from lastSeen', async () => {
    const changes = vi.fn<[number?], Promise<ChangeEvent[]>>()
    changes.mockResolvedValueOnce([ev(1)])
    changes.mockRejectedValueOnce(new Error('boom'))
    changes.mockResolvedValueOnce([ev(2)])
    changes.mockResolvedValue([])
    const client = new CDCStreamClient({
      client: { changes },
      sseFactory: null,
      backoffMs: [50],
      pollIntervalMs: 1000,
    })
    const sub = client.subscribe({})
    // First tick (since=0) → [ev1]
    await vi.advanceTimersByTimeAsync(0)
    expect(changes.mock.calls[0]).toEqual([0])
    // Next scheduled poll fires at 1000ms (pollIntervalMs)
    await vi.advanceTimersByTimeAsync(1000)
    // Second tick (since=1) → throws → backoff 50ms
    expect(changes.mock.calls[1]).toEqual([1])
    await vi.advanceTimersByTimeAsync(50)
    // Reconnect tick (since=1) → [ev2]
    expect(changes.mock.calls[2]).toEqual([1])
    const received = await readN(sub.events, 2)
    expect(received.map((e) => e.lsn)).toEqual([1, 2])
    sub.close()
  })

  it('close() stops REST polling', async () => {
    const changes = vi.fn<[number?], Promise<ChangeEvent[]>>().mockResolvedValue([])
    const client = new CDCStreamClient({
      client: { changes },
      sseFactory: null,
      pollIntervalMs: 100,
    })
    const sub = client.subscribe({})
    await vi.advanceTimersByTimeAsync(0)
    expect(changes).toHaveBeenCalledTimes(1)
    sub.close()
    await vi.advanceTimersByTimeAsync(500)
    expect(changes).toHaveBeenCalledTimes(1)
  })
})
