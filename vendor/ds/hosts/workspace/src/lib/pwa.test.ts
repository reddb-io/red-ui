import { afterEach, describe, expect, it, vi } from "vitest";
import { registerWorkspacePwa } from "./pwa";
import { isPwaAssetRequest, obsoletePwaCaches } from "./pwa-cache";
afterEach(() => vi.unstubAllGlobals());

describe("PWA cache boundaries", () => {
  const origin = "https://ui.example";
  const assets = new Set(["/_app/immutable/client.js", "/icon-512.png"]);
  it("allows declared application assets while excluding APIs, auth and mutations", () => {
    expect(
      isPwaAssetRequest(new Request(origin + "/icon-512.png"), origin, assets)
    ).toBe(true);
    for (const request of [
      new Request(origin + "/stats"),
      new Request(origin + "/query", {
        method: "POST",
        body: "INSERT INTO records VALUES (1)",
      }),
      new Request(origin + "/icon-512.png?token=secret"),
      new Request(origin + "/icon-512.png", {
        headers: { Authorization: "Bearer secret" },
      }),
      new Request(origin + "/icon-512.png", { cache: "no-store" }),
      new Request("https://database.example/icon-512.png"),
    ])
      expect(isPwaAssetRequest(request, origin, assets)).toBe(false);
  });
  it("cleans only its own scope and leaves other applications' caches alone", () => {
    expect(
      obsoletePwaCaches(
        [
          "other-app",
          "red-ui-shell:/tools/:old",
          "red-ui-shell:/:old",
          "red-ui-shell:/:new",
        ],
        "red-ui-shell:/:new",
        "red-ui-shell:/:"
      )
    ).toEqual(["red-ui-shell:/:old"]);
  });
});

describe("PWA registration", () => {
  function browser() {
    const register = vi.fn(async () => ({
      scope: "https://ui.example/tools/",
    }));
    const window: Record<string, unknown> = { isSecureContext: true };
    window.self = window;
    window.top = window;
    vi.stubGlobal("window", window);
    vi.stubGlobal("navigator", { serviceWorker: { register } });
    return { register, window };
  }
  it("registers the base-aware worker without HTTP cache reuse", async () => {
    const { register } = browser();
    await registerWorkspacePwa("/tools");
    expect(register).toHaveBeenCalledWith("/tools/service-worker.js", {
      scope: "/tools/",
      type: "module",
      updateViaCache: "none",
    });
  });
  it("leaves embedded, native and insecure hosts untouched", async () => {
    const { register, window } = browser();
    window.top = {};
    expect(await registerWorkspacePwa("")).toBeNull();
    window.top = window;
    window.__TAURI_INTERNALS__ = {};
    expect(await registerWorkspacePwa("")).toBeNull();
    delete window.__TAURI_INTERNALS__;
    window.isSecureContext = false;
    expect(await registerWorkspacePwa("")).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
  it("degrades to the online app when registration is blocked", async () => {
    const { register } = browser();
    register.mockRejectedValue(new Error("storage blocked"));
    expect(await registerWorkspacePwa("")).toBeNull();
  });
});
