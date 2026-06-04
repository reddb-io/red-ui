// Global activity tracker. Every reddb HTTP call should flow through
// `activity.track(label, op)` so the UI can show a single source of
// truth for "what's happening right now". Two roles:
//
//   - Counter of in-flight requests (drives the topbar pulse).
//   - Rolling log of the last 20 labels with duration + outcome
//     (drives the activity panel).
//
// Labels should describe the *intent* of the call ("schema · collections",
// "tales · SELECT", "grimm_graph · edges + nodes"), not the raw URL —
// that's what makes the panel readable when scanning during an incident.
//
// All $state reads/writes inside `track` are wrapped in `untrack()`. Why:
// callers commonly invoke `track()` from inside a `$effect` (e.g. the
// layout's connection.refresh on unlock). If we read+write `log`/`inflight`
// without untrack, the effect would track those as dependencies and our
// own writes would re-fire it — infinite loop (`effect_update_depth_exceeded`).

import { untrack } from "svelte";

export interface ActivityEntry {
  id: number;
  label: string;
  startedAt: number;
  durationMs: number | null;
  status: "pending" | "ok" | "error";
  error?: string;
}

const MAX_LOG = 20;

class ActivityStore {
  inflight = $state(0);
  active = $derived(this.inflight > 0);
  log = $state<ActivityEntry[]>([]);
  private nextId = 1;

  async track<T>(label: string, op: () => Promise<T>): Promise<T> {
    const id = this.nextId++;
    const entry: ActivityEntry = {
      id,
      label,
      startedAt: Date.now(),
      durationMs: null,
      status: "pending",
    };
    untrack(() => {
      this.log = [entry, ...this.log].slice(0, MAX_LOG);
      this.inflight += 1;
    });
    try {
      const result = await op();
      untrack(() =>
        this.update(id, {
          durationMs: Date.now() - entry.startedAt,
          status: "ok",
        })
      );
      return result;
    } catch (err) {
      untrack(() =>
        this.update(id, {
          durationMs: Date.now() - entry.startedAt,
          status: "error",
          error: (err as Error).message,
        })
      );
      throw err;
    } finally {
      untrack(() => {
        this.inflight = Math.max(0, this.inflight - 1);
      });
    }
  }

  private update(id: number, patch: Partial<ActivityEntry>) {
    this.log = this.log.map((e) => (e.id === id ? { ...e, ...patch } : e));
  }

  /** Panic button for when the indicator gets stuck out of sync with
   * reality (e.g. a fetch that never resolves due to a dropped socket).
   * Clears the counter and marks remaining pending entries as errored. */
  reset() {
    untrack(() => {
      this.log = this.log.map((e) =>
        e.status === "pending"
          ? {
              ...e,
              status: "error",
              error: "reset by user",
              durationMs: Date.now() - e.startedAt,
            }
          : e
      );
      this.inflight = 0;
    });
  }
}

export const activity = new ActivityStore();
