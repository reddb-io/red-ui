// Instrumented developer console (#128). A deliberately framework-agnostic,
// rune-free observable store so the data layer (`RedClient`, transports) can
// log every query and HTTP call *without* importing Svelte — the client seam
// must not depend on the UI runtime. The Svelte panel bridges this store into
// reactivity by subscribing and copying the snapshot into `$state`.
//
// Every entry is one round-trip the client made: the verb (HTTP method /
// statement head), the target (path or endpoint), how long it took, how many
// rows came back, and a *sanitized* payload — secrets are redacted before an
// entry is ever stored, so a copy action can never leak a token.

/** What kind of round-trip an entry records. */
export type ConsoleEntryKind = "query" | "http";

export interface ConsoleEntry {
  /** Monotonic id, assigned on record. Stable for keying/dedup in the panel. */
  id: number;
  kind: ConsoleEntryKind;
  /** HTTP method or statement head, e.g. `POST`, `GET`, `SELECT`. */
  verb: string;
  /** Endpoint path or logical target the call hit, e.g. `/query`. */
  target: string;
  /** Absolute wall-clock time the call started. */
  startedAt: number;
  /** Round-trip duration in milliseconds. */
  durationMs: number;
  /** True when the call succeeded (2xx / resolved). */
  ok: boolean;
  /** HTTP status code when one is known. */
  status?: number;
  /** Rows returned, when the response carries a row/record count. */
  rowCount?: number;
  /** Sanitized request payload or query text — copyable, never contains secrets. */
  payload?: string;
  /** Error text when the call failed. */
  error?: string;
}

/** A record as handed to the store — the store owns `id`. */
export type ConsoleEntryInput = Omit<ConsoleEntry, "id">;

/**
 * A per-entry tap on the console. Unlike `subscribe` (which observes the whole
 * snapshot for rendering), a sink receives each entry exactly once, as it is
 * recorded — the shape an embedding host wants for mirroring red-ui's traffic
 * into its own developer console.
 */
export type ConsoleSink = (entry: ConsoleEntry) => void;

type Listener = (entries: readonly ConsoleEntry[]) => void;

/** Keys whose values are always masked, matched case-insensitively as substrings. */
const SENSITIVE_KEY_RE =
  /pass(word)?|secret|token|api[-_]?key|authorization|auth|credential|cookie|session|bearer|private[-_]?key|mfa/i;

const REDACTED = "«redacted»";

/**
 * Recursively redact sensitive values from an arbitrary structure, returning a
 * plain clone safe to stringify. A value under a sensitive key is replaced with
 * a marker rather than dropped, so the reader still sees *that* a field existed.
 * Depth- and breadth-bounded so a pathological payload can't blow the console.
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (depth > 6) return "«…»";
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((v) => redactSecrets(v, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_RE.test(k)
        ? REDACTED
        : redactSecrets(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Turn a request body (a JSON string, an object, or anything else) into a
 * sanitized, human-readable string for the entry's copyable payload. Parses
 * JSON so keys can be redacted; falls back to a truncated raw string when the
 * body isn't JSON. Returns `undefined` for an absent body.
 */
export function sanitizePayload(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  let parsed: unknown = body;
  if (typeof body === "string") {
    if (body.length === 0) return undefined;
    try {
      parsed = JSON.parse(body);
    } catch {
      return body.length > 2000 ? `${body.slice(0, 2000)}…` : body;
    }
  }
  try {
    const json = JSON.stringify(redactSecrets(parsed), null, 2);
    return json.length > 4000 ? `${json.slice(0, 4000)}…` : json;
  } catch {
    return undefined;
  }
}

/**
 * The developer console log. A bounded ring of entries with a minimal
 * subscribe/emit surface — no framework, no runes. `record` is the single
 * write path the client seam calls; `subscribe` is how the panel observes.
 */
export class DevConsoleStore {
  private entries: ConsoleEntry[] = [];
  private readonly listeners = new Set<Listener>();
  private readonly sinks = new Set<ConsoleSink>();
  private nextId = 1;

  /** Cap on retained entries; oldest are dropped past this. */
  constructor(private readonly capacity = 500) {}

  /** Append one round-trip. Assigns the id, trims to capacity, notifies. */
  record(input: ConsoleEntryInput): ConsoleEntry {
    const entry: ConsoleEntry = { ...input, id: this.nextId++ };
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
    this.emit();
    for (const sink of this.sinks) {
      try {
        sink(entry);
      } catch {
        // A host-owned sink must never be able to break the client seam.
      }
    }
    return entry;
  }

  /**
   * Tap every future entry. Entries recorded before the sink was added are
   * not replayed — a host mirrors live traffic, it doesn't import history.
   * Returns an unsubscribe.
   */
  addSink(sink: ConsoleSink): () => void {
    this.sinks.add(sink);
    return () => {
      this.sinks.delete(sink);
    };
  }

  /** A frozen, newest-last snapshot of the log. */
  snapshot(): readonly ConsoleEntry[] {
    return this.entries.slice();
  }

  /** Number of retained entries. */
  get size(): number {
    return this.entries.length;
  }

  /** Drop every entry and notify. */
  clear(): void {
    if (this.entries.length === 0) return;
    this.entries = [];
    this.emit();
  }

  /**
   * Observe the log. The listener fires immediately with the current snapshot
   * and again on every change. Returns an unsubscribe.
   */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const listener of this.listeners) listener(snap);
  }
}

/** The singleton the client seam records into and the panel observes. */
export const devConsole = new DevConsoleStore();
