import { afterEach, describe, expect, it } from "vitest";
import { render } from "svelte/server";
import { activity } from "./activity.svelte";
import GlobalProgressBar from "./GlobalProgressBar.svelte";

afterEach(() => {
  activity.reset();
});

describe("activity progress visibility", () => {
  it("renders the global progressbar only while real activity is in flight", async () => {
    expect(render(GlobalProgressBar).body).not.toContain('role="progressbar"');

    let release!: () => void;
    const tracked = activity.track(
      "test - component visibility",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    expect(render(GlobalProgressBar).body).toContain('role="progressbar"');

    release();
    await tracked;

    expect(render(GlobalProgressBar).body).not.toContain('role="progressbar"');
  });

  it("is visible only while the global in-flight count is non-zero", async () => {
    let release!: () => void;
    const tracked = activity.track(
      "test - slow call",
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        })
    );

    expect(activity.inflight).toBe(1);
    expect(activity.active).toBe(true);

    release();
    await tracked;

    expect(activity.inflight).toBe(0);
    expect(activity.active).toBe(false);
  });

  it("stays visible until every overlapping request settles", async () => {
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const first = activity.track(
      "test - first",
      () =>
        new Promise<void>((resolve) => {
          releaseFirst = resolve;
        })
    );
    const second = activity.track(
      "test - second",
      () =>
        new Promise<void>((resolve) => {
          releaseSecond = resolve;
        })
    );

    expect(activity.inflight).toBe(2);
    expect(activity.active).toBe(true);

    releaseFirst();
    await first;

    expect(activity.inflight).toBe(1);
    expect(activity.active).toBe(true);

    releaseSecond();
    await second;

    expect(activity.inflight).toBe(0);
    expect(activity.active).toBe(false);
  });
});
