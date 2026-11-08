import { afterEach, describe, expect, it, vi } from "vitest";
import { startVisiblePoll, type VisibilitySource } from "./visible-poll";

class FakeVisibilitySource extends EventTarget implements VisibilitySource {
  hidden = false;
}

afterEach(() => vi.useRealTimers());

describe("visible polling", () => {
  it("polls at the configured interval, pauses while hidden and refreshes on return", async () => {
    vi.useFakeTimers();
    const source = new FakeVisibilitySource();
    const operation = vi.fn();
    const stop = startVisiblePoll(operation, 30_000, source);

    await vi.advanceTimersByTimeAsync(30_000);
    expect(operation).toHaveBeenCalledTimes(1);

    source.hidden = true;
    await vi.advanceTimersByTimeAsync(90_000);
    expect(operation).toHaveBeenCalledTimes(1);

    source.hidden = false;
    source.dispatchEvent(new Event("visibilitychange"));
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(2);

    stop();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not overlap a slow request", async () => {
    vi.useFakeTimers();
    const source = new FakeVisibilitySource();
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => (finish = resolve));
    const operation = vi.fn(() => pending);
    const stop = startVisiblePoll(operation, 30_000, source);

    await vi.advanceTimersByTimeAsync(90_000);
    expect(operation).toHaveBeenCalledTimes(1);
    finish();
    await pending;
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(operation).toHaveBeenCalledTimes(2);
    stop();
  });
});
