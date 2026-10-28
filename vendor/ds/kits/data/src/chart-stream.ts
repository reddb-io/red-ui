import type { ChartTimestamp } from "./chart";
export type { ChartTimestamp, ChartTimeRange } from "./chart";

/** A timestamped observation; financial aggregation and transport remain caller-owned. */
export interface ChartStreamPoint { readonly x: ChartTimestamp }
/** Bounded, coalesced updates shared by every native chart adapter. */
export interface ChartStreamOptions<T extends ChartStreamPoint> {
  /** Initial observations, normalized and bounded before the first subscription or SSR read. */
  initial?: readonly T[];
  /** Maximum observations retained in the receiving buffer. Defaults to 600. */
  maxPoints?: number;
  /** Optional retention age in milliseconds, relative to the newest received timestamp. */
  windowMs?: number;
  /** Minimum interval between scheduled publications, in milliseconds; defaults to 100. Zero selects explicit flush(). */
  intervalMs?: number;
}
/** Immutable published view. Pausing retains this data while the bounded receiver continues accepting updates. */
export interface ChartStreamSnapshot<T extends ChartStreamPoint> {
  readonly data: readonly T[];
  readonly paused: boolean;
  /** Monotonically increasing publication revision, including pause/resume changes. */
  readonly revision: number;
  /** Number of received observations through this publication, including replacements and expired arrivals. */
  readonly received: number;
}
/** A portable external store: Svelte store subscription and React useSyncExternalStore both consume this contract. */
export interface ChartStream<T extends ChartStreamPoint> {
  /** Insert or replace complete observations at the same timestamp; later calls win. Invalid timestamps reject a batch atomically. */
  upsert(points: T | readonly T[]): void;
  /** Replace the receiving buffer, for a new history snapshot or reconnect. A paused view stays frozen until resume. */
  reset(points: readonly T[]): void;
  /** Freeze the published view while receiving and trimming continue. */
  pause(): void;
  /** Publish the most recent bounded receiver immediately and continue scheduled updates. */
  resume(): void;
  /** Publish pending updates now; respects pause. Useful with intervalMs: 0 and a caller-owned scheduler. */
  flush(): void;
  /** Current stable snapshot, suitable for React's getSnapshot. */
  getSnapshot(): ChartStreamSnapshot<T>;
  /** Stable initial snapshot for SSR/hydration. Create an instance per request or mounted consumer. */
  getServerSnapshot(): ChartStreamSnapshot<T>;
  /** Receive the current snapshot synchronously, then coalesced publications. Last unsubscribe cancels scheduled work. */
  subscribe(listener: (snapshot: ChartStreamSnapshot<T>) => void): () => void;
  /** Read receiver counters without publishing or changing the paused view. */
  stats(): { readonly buffered: number; readonly received: number };
  /** Cancel scheduled work and release subscriptions/buffer. Late writes are ignored; disposal is idempotent. */
  dispose(): void;
}

/** Timestamp upserts and bounded retention without a framework, network connection or browser-only side effects. */
export function createChartStream<T extends ChartStreamPoint>(options: ChartStreamOptions<T> = {}): ChartStream<T> {
  const { maxPoints = 600, windowMs, intervalMs = 100 } = options;
  if (!Number.isInteger(maxPoints) || maxPoints < 1) throw new Error("ChartStream: maxPoints must be a positive integer.");
  if (windowMs !== undefined && (!Number.isFinite(windowMs) || windowMs <= 0)) throw new Error("ChartStream: windowMs must be finite and positive.");
  if (!Number.isFinite(intervalMs) || intervalMs < 0) throw new Error("ChartStream: intervalMs must be finite and nonnegative.");
  const points = new Map<number, T>(), keys: number[] = [], listeners = new Set<(snapshot: ChartStreamSnapshot<T>) => void>();
  let latest = -Infinity, received = 0, dirty = false, paused = false, disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  function validate(batch: readonly T[]) {
    for (const point of batch) if (!Number.isFinite(+point.x)) throw new Error("ChartStream: observation timestamps must be finite.");
  }
  function receive(batch: readonly T[]) {
    for (const point of batch) {
      received++;
      const x = +point.x;
      latest = Math.max(latest, x);
      if (windowMs !== undefined && x < latest - windowMs) continue;
      if (!points.has(x)) {
        let low = 0, high = keys.length;
        while (low < high) { const middle = (low + high) >>> 1; if (keys[middle]! < x) low = middle + 1; else high = middle; }
        keys.splice(low, 0, x);
      }
      points.set(x, { ...point, x: point.x instanceof Date ? new Date(+point.x) : point.x });
      while (keys.length > maxPoints || keys.length > 0 && windowMs !== undefined && keys[0]! < latest - windowMs) points.delete(keys.shift()!);
      dirty = true;
    }
  }
  const initial = options.initial ?? [];
  validate(initial); receive(initial);
  const values = () => Object.freeze(keys.map(key => points.get(key)!));
  let snapshot: ChartStreamSnapshot<T> = Object.freeze({ data: values(), paused, revision: 0, received });
  const serverSnapshot = snapshot;
  dirty = false;
  function cancel() { if (timer !== undefined) clearTimeout(timer); timer = undefined; }
  function notify() { for (const listener of [...listeners]) if (listeners.has(listener)) listener(snapshot); }
  function publish() {
    cancel(); dirty = false;
    snapshot = Object.freeze({ data: values(), paused, revision: snapshot.revision + 1, received });
    notify();
  }
  function schedule() {
    if (disposed || paused || !dirty || !listeners.size || intervalMs === 0 || timer !== undefined) return;
    timer = setTimeout(() => { timer = undefined; if (!disposed && !paused && dirty) publish(); }, intervalMs);
  }
  return {
    upsert(input) { if (disposed) return; const batch = (Array.isArray(input) ? input : [input]) as readonly T[]; validate(batch); receive(batch); schedule(); },
    reset(batch) { if (disposed) return; validate(batch); points.clear(); keys.length = 0; latest = -Infinity; receive(batch); dirty = true; schedule(); },
    pause() { if (disposed || paused) return; paused = true; cancel(); snapshot = Object.freeze({ ...snapshot, paused, revision: snapshot.revision + 1 }); notify(); },
    resume() { if (disposed || !paused && !dirty) return; paused = false; publish(); },
    flush() { if (!disposed && !paused && dirty) publish(); },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener) {
      if (disposed) { listener(snapshot); return () => {}; }
      listeners.add(listener); listener(snapshot); schedule();
      return () => { listeners.delete(listener); if (!listeners.size) cancel(); };
    },
    stats: () => ({ buffered: points.size, received }),
    dispose() { if (disposed) return; disposed = true; cancel(); listeners.clear(); points.clear(); keys.length = 0; },
  };
}
