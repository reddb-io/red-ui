import { afterEach, describe, expect, it, vi } from "vitest";
import { RedClient } from "./client";

afterEach(() => vi.unstubAllGlobals());

describe("default browser transport", () => {
  it("retains the global receiver when calling the native fetch as a client method", async () => {
    const fetch = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(new Response(JSON.stringify({ uptime_secs: 1 })));
    });
    vi.stubGlobal("fetch", fetch);
    await expect(
      new RedClient("https://db.example").stats()
    ).resolves.toMatchObject({ uptime_secs: 1 });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
