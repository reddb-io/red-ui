import { describe, expect, it, vi } from "vitest";
import {
  DevConsoleStore,
  redactSecrets,
  sanitizePayload,
  type ConsoleEntry,
} from "./dev-console";

describe("redactSecrets", () => {
  it("masks sensitive keys anywhere in the tree but keeps their shape", () => {
    const out = redactSecrets({
      query: "SELECT 1",
      password: "hunter2",
      nested: { api_key: "abc", authorization: "Bearer x", keep: 3 },
      list: [{ token: "t" }, { safe: "y" }],
    });
    expect(out).toEqual({
      query: "SELECT 1",
      password: "«redacted»",
      nested: { api_key: "«redacted»", authorization: "«redacted»", keep: 3 },
      list: [{ token: "«redacted»" }, { safe: "y" }],
    });
  });

  it("bounds recursion depth so a deep structure can't blow the console", () => {
    let deep: Record<string, unknown> = { leaf: 1 };
    for (let i = 0; i < 20; i++) deep = { child: deep };
    expect(() => JSON.stringify(redactSecrets(deep))).not.toThrow();
  });
});

describe("sanitizePayload", () => {
  it("parses a JSON body and redacts secrets in the copyable text", () => {
    const out = sanitizePayload(JSON.stringify({ query: "SELECT 1", token: "secret" }));
    expect(out).toContain("SELECT 1");
    expect(out).toContain("«redacted»");
    expect(out).not.toContain("secret");
  });

  it("returns undefined for an absent or empty body", () => {
    expect(sanitizePayload(undefined)).toBeUndefined();
    expect(sanitizePayload(null)).toBeUndefined();
    expect(sanitizePayload("")).toBeUndefined();
  });

  it("passes through a non-JSON string, truncating overly long text", () => {
    expect(sanitizePayload("not json")).toBe("not json");
    const long = "x".repeat(5000);
    const out = sanitizePayload(long)!;
    expect(out.length).toBeLessThan(long.length);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("DevConsoleStore", () => {
  it("assigns monotonic ids and returns a newest-last snapshot", () => {
    const store = new DevConsoleStore();
    const a = store.record({
      kind: "http",
      verb: "GET",
      target: "/stats",
      startedAt: 0,
      durationMs: 5,
      ok: true,
    });
    const b = store.record({
      kind: "query",
      verb: "POST",
      target: "/query",
      startedAt: 1,
      durationMs: 8,
      ok: true,
      rowCount: 3,
    });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
    expect(store.snapshot().map((e) => e.id)).toEqual([1, 2]);
    expect(store.size).toBe(2);
  });

  it("notifies subscribers immediately and on every change", () => {
    const store = new DevConsoleStore();
    const seen: number[] = [];
    const unsub = store.subscribe((entries) => seen.push(entries.length));
    expect(seen).toEqual([0]); // immediate snapshot
    store.record(baseEntry());
    expect(seen).toEqual([0, 1]);
    unsub();
    store.record(baseEntry());
    expect(seen).toEqual([0, 1]); // no more notifications after unsubscribe
  });

  it("clears entries and notifies once", () => {
    const store = new DevConsoleStore();
    store.record(baseEntry());
    const spy = vi.fn();
    store.subscribe(spy);
    spy.mockClear();
    store.clear();
    expect(store.size).toBe(0);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    store.clear(); // already empty — no notification
    expect(spy).not.toHaveBeenCalled();
  });

  it("drops the oldest entries past capacity", () => {
    const store = new DevConsoleStore(3);
    for (let i = 0; i < 5; i++) store.record(baseEntry());
    expect(store.size).toBe(3);
    // ids 3,4,5 survive; 1,2 were dropped.
    expect(store.snapshot().map((e) => e.id)).toEqual([3, 4, 5]);
  });
});

function baseEntry(): Omit<ConsoleEntry, "id"> {
  return {
    kind: "http",
    verb: "GET",
    target: "/stats",
    startedAt: 0,
    durationMs: 1,
    ok: true,
  };
}
