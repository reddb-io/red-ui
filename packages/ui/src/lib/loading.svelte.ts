// Connect/boot loading model (#127). Slow opens (sidecar spawn, readiness,
// handshake, initial schema/stats fetch) get real, timestamped feedback: a
// started-at, an ordered log of steps (each with a label, optional detail, and
// its own start time + outcome), and a "current" step that stays on screen —
// with its elapsed time — while it's still running (a stalled step reads AS
// stalled). Live-or-empty applies: steps are appended by the actual connect
// sequence, never synthesized to fake progress.
//
// `$state` is compiled here (`.svelte.ts`), so the model is reactive and the
// overlay re-renders as steps land. Writes are wrapped in `untrack()` because
// the connect sequence commonly runs from inside a Svelte `$effect` (the
// layout's auto-refresh); an untracked write keeps our own mutations from
// re-firing that effect.

import { untrack } from "svelte";

export type LoadingStepStatus = "active" | "done" | "error";

export interface LoadingStep {
  id: number;
  label: string;
  detail?: string;
  /** Absolute wall-clock time the step was appended. */
  startedAt: number;
  /** Wall-clock duration once the step resolves; null while still active. */
  durationMs: number | null;
  status: LoadingStepStatus;
  error?: string;
}

/**
 * Format a millisecond elapsed value for the overlay badge and per-step timing.
 * Sub-second reads as fractional seconds ("0.4s"); longer as one-decimal
 * seconds ("12.3s"). Kept pure so the render is unit-testable without a clock.
 */
export function formatElapsed(ms: number): string {
  const clamped = Math.max(0, ms);
  return `${(clamped / 1000).toFixed(1)}s`;
}

class LoadingStore {
  /** Wall-clock time the current open began; null when nothing is opening. */
  startedAt = $state<number | null>(null);
  /** Headline for what's being opened, e.g. "Opening Docker primary". */
  label = $state<string | null>(null);
  /** Ordered, timestamped step log for the current open. */
  steps = $state<LoadingStep[]>([]);
  private nextId = 1;

  /** True while an open is in progress. Gates the overlay. */
  get active(): boolean {
    return this.startedAt !== null;
  }

  /** The step currently on screen — the last appended one, if any. */
  get current(): LoadingStep | null {
    return this.steps.length ? this.steps[this.steps.length - 1] : null;
  }

  /** Elapsed time since the open began, for the ticking badge. */
  elapsedMs(now = Date.now()): number {
    return this.startedAt === null ? 0 : Math.max(0, now - this.startedAt);
  }

  /**
   * Begin a fresh open. Resets the log and stamps the start. Any subsequent
   * `step()` calls append to this open until `succeed`/`fail` finishes it.
   */
  begin(label: string, now = Date.now()): void {
    untrack(() => {
      this.startedAt = now;
      this.label = label;
      this.steps = [];
      this.nextId = 1;
    });
  }

  /**
   * Append a step and mark it the current (active) one, closing out the
   * previous active step as done. No-op if no open is in progress — steps are
   * only ever real work inside an open.
   */
  step(label: string, detail?: string, now = Date.now()): void {
    untrack(() => {
      if (this.startedAt === null) return;
      const closed = this.steps.map((s) =>
        s.status === "active"
          ? { ...s, status: "done" as const, durationMs: now - s.startedAt }
          : s
      );
      this.steps = [
        ...closed,
        {
          id: this.nextId++,
          label,
          ...(detail ? { detail } : {}),
          startedAt: now,
          durationMs: null,
          status: "active",
        },
      ];
    });
  }

  /** Finish the open successfully: close the active step and hide the overlay. */
  succeed(now = Date.now()): void {
    untrack(() => {
      this.#closeActive(now);
      this.startedAt = null;
    });
  }

  /**
   * Finish the open with a failure: mark the active step errored and hide the
   * overlay (the Connect flow surfaces the error separately).
   */
  fail(error?: string, now = Date.now()): void {
    untrack(() => {
      this.steps = this.steps.map((s) =>
        s.status === "active"
          ? {
              ...s,
              status: "error" as const,
              durationMs: now - s.startedAt,
              ...(error ? { error } : {}),
            }
          : s
      );
      this.startedAt = null;
    });
  }

  #closeActive(now: number): void {
    this.steps = this.steps.map((s) =>
      s.status === "active"
        ? { ...s, status: "done" as const, durationMs: now - s.startedAt }
        : s
    );
  }
}

export const loading = new LoadingStore();
