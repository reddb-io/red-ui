import type {
  QueueMessage,
  QueueEvent,
  QueueCommand,
} from "../../queue-explorer";
/** Queue inspection with caller-owned commands and mutation. */
export interface QueueExplorerContract {
  /** Accessible name of the explorer. */
  label: string;
  /** Original messages and delivery metadata. */
  messages: readonly QueueMessage[];
  /** Event envelopes extracted by the caller's adapter. */
  events: readonly QueueEvent[];
  /** Commands are documentation only; the component never executes them. */
  commands?: readonly QueueCommand[];
  /** Optional collection identity. Changes cancel pending completion callbacks. */
  context?: string;
  /** Caller-reported query error, distinct from an empty result. */
  error?: string | null;
  /** Enqueues a message. Reject on failure to retain the draft. Omit for read-only inspection. */
  onenqueue?: (payload: unknown, signal: AbortSignal) => Promise<void>;
}
