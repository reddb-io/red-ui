import type { ChangeEvent, RedClient } from './client'

export interface EventSourceLike {
  close(): void
  onmessage: ((ev: { data: string }) => void) | null
  onerror: ((ev: unknown) => void) | null
  onopen: ((ev: unknown) => void) | null
}

export type SseFactory = (url: string) => EventSourceLike

export interface CDCStreamClientOptions {
  /** Used for REST polling fallback (and SSE URL construction when baseUrl absent). */
  client: Pick<RedClient, 'changes'> & { baseUrl?: string }
  /** If null, SSE is disabled and REST polling is always used. */
  sseFactory?: SseFactory | null
  /**
   * Called once before the first SSE attempt. If it resolves to false (or throws),
   * SSE is considered unsupported and REST polling is used for this subscription.
   * Default: returns true if sseFactory is provided.
   */
  sseProbe?: () => Promise<boolean>
  /** Reconnect backoff schedule, in ms. Default: [1000, 2000, 4000, 8000, 30000]. */
  backoffMs?: number[]
  /** REST polling interval. Default: 1000ms. */
  pollIntervalMs?: number
  /** Test seam — defaults to globalThis.setTimeout / clearTimeout. */
  timers?: {
    setTimeout: (fn: () => void, ms: number) => unknown
    clearTimeout: (h: unknown) => void
  }
}

export interface SubscribeOpts {
  collection?: string
  sinceLsn?: number
}

export interface Subscription {
  events: ReadableStream<ChangeEvent>
  close(): void
}

const DEFAULT_BACKOFF = [1000, 2000, 4000, 8000, 30000]

export class CDCStreamClient {
  constructor(public readonly opts: CDCStreamClientOptions) {}

  subscribe(opts: SubscribeOpts = {}): Subscription {
    return new CDCSubscription(this, opts)
  }

  /** Build the SSE URL. Visible for tests. */
  buildSseUrl(collection: string | undefined, sinceLsn: number): string {
    const base = this.opts.client.baseUrl ?? ''
    const params = new URLSearchParams()
    if (sinceLsn > 0) params.set('since', String(sinceLsn))
    if (collection) params.set('collection', collection)
    const qs = params.toString()
    return `${base}/changes/stream${qs ? `?${qs}` : ''}`
  }
}

class CDCSubscription implements Subscription {
  events: ReadableStream<ChangeEvent>
  private controller!: ReadableStreamDefaultController<ChangeEvent>
  private closed = false
  private lastSeenLsn: number
  private currentSse: EventSourceLike | null = null
  private pollTimer: unknown = null
  private reconnectTimer: unknown = null
  private backoffIdx = 0
  private transport: 'sse' | 'rest' | null = null

  constructor(
    private parent: CDCStreamClient,
    private opts: SubscribeOpts,
  ) {
    this.lastSeenLsn = opts.sinceLsn ?? 0
    this.events = new ReadableStream<ChangeEvent>({
      start: (controller) => {
        this.controller = controller
      },
      cancel: () => this.close(),
    })
    void this.connect()
  }

  private timers() {
    return (
      this.parent.opts.timers ?? {
        setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
        clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof globalThis.setTimeout>),
      }
    )
  }

  private async connect() {
    if (this.closed) return
    if (this.transport === null) {
      // First connect — choose transport.
      const factory = this.parent.opts.sseFactory
      if (factory === null || factory === undefined) {
        this.transport = 'rest'
      } else {
        const probe = this.parent.opts.sseProbe ?? (async () => true)
        let supported = false
        try {
          supported = await probe()
        } catch {
          supported = false
        }
        if (this.closed) return
        this.transport = supported ? 'sse' : 'rest'
      }
    }

    if (this.transport === 'sse') this.startSse()
    else this.startRest()
  }

  private startSse() {
    const factory = this.parent.opts.sseFactory
    if (!factory) {
      this.transport = 'rest'
      this.startRest()
      return
    }
    const url = this.parent.buildSseUrl(this.opts.collection, this.lastSeenLsn)
    let es: EventSourceLike
    try {
      es = factory(url)
    } catch {
      this.scheduleReconnect()
      return
    }
    this.currentSse = es
    es.onopen = () => {
      this.backoffIdx = 0
    }
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as ChangeEvent
        this.emit(data)
      } catch {
        // ignore malformed payloads
      }
    }
    es.onerror = () => {
      if (this.closed) return
      try {
        es.close()
      } catch {
        // ignore
      }
      if (this.currentSse === es) this.currentSse = null
      this.scheduleReconnect()
    }
  }

  private startRest() {
    const tick = async () => {
      if (this.closed) return
      try {
        const events = await this.parent.opts.client.changes(this.lastSeenLsn)
        if (this.closed) return
        for (const e of events) this.emit(e)
        this.backoffIdx = 0
        const interval = this.parent.opts.pollIntervalMs ?? 1000
        this.pollTimer = this.timers().setTimeout(() => {
          this.pollTimer = null
          void tick()
        }, interval)
      } catch {
        if (this.closed) return
        this.scheduleReconnect()
      }
    }
    void tick()
  }

  private emit(e: ChangeEvent) {
    if (this.closed) return
    if (e.lsn <= this.lastSeenLsn) return
    this.lastSeenLsn = e.lsn
    try {
      this.controller.enqueue(e)
    } catch {
      // stream may have been cancelled — close ourselves.
      this.close()
    }
  }

  private scheduleReconnect() {
    if (this.closed) return
    const delays = this.parent.opts.backoffMs ?? DEFAULT_BACKOFF
    const delay = delays[Math.min(this.backoffIdx, delays.length - 1)]
    this.backoffIdx++
    this.reconnectTimer = this.timers().setTimeout(() => {
      this.reconnectTimer = null
      if (this.transport === 'sse') this.startSse()
      else this.startRest()
    }, delay)
  }

  close() {
    if (this.closed) return
    this.closed = true
    if (this.currentSse) {
      try {
        this.currentSse.close()
      } catch {
        // ignore
      }
      this.currentSse = null
    }
    const { clearTimeout } = this.timers()
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try {
      this.controller.close()
    } catch {
      // already closed
    }
  }
}
