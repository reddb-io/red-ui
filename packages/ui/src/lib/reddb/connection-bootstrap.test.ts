import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PERSISTED_CONNECTION_KEY,
  readInjectedGlobalBootstrap,
  readPersistedLocalBootstrap,
  readUrlOpenContractBootstrap,
  resolveConnectionBootstrap,
  type BootstrapStorage,
  type UrlBootstrapHistory,
  type UrlBootstrapLocation,
} from "./connection-bootstrap";

function storageWith(value: string | null): BootstrapStorage {
  return {
    getItem: (key) => (key === DEFAULT_PERSISTED_CONNECTION_KEY ? value : null),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Connection Bootstrap", () => {
  it("resolves sources in priority order", async () => {
    await expect(
      resolveConnectionBootstrap({
        readTauri: () => ({ target: "http://tauri:5055" }),
        readInjectedGlobal: () => ({ target: "http://global:5055" }),
        readUrl: () => ({ target: "http://url:5055" }),
        readPersisted: () => ({ target: "http://persisted:5055" }),
      })
    ).resolves.toEqual({ target: "http://tauri:5055" });

    await expect(
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => ({ target: "http://global:5055" }),
        readUrl: () => ({ target: "http://url:5055" }),
        readPersisted: () => ({ target: "http://persisted:5055" }),
      })
    ).resolves.toEqual({ target: "http://global:5055" });
  });

  it("falls through absent high-priority sources", async () => {
    await expect(
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => undefined,
        readUrl: () => ({ target: "http://url:5055" }),
        readPersisted: () => ({ target: "http://persisted:5055" }),
      })
    ).resolves.toEqual({ target: "http://url:5055" });
  });

  it("extracts the Open Contract token from the hash", async () => {
    expect(
      readUrlOpenContractBootstrap(
        "?cs=http://host:5055&to=/cluster&token=query-secret",
        "#token=hash-secret"
      )
    ).toEqual({
      target: "http://host:5055",
      token: "hash-secret",
      route: "/cluster",
    });
  });

  it("consumes window.__RED_BOOTSTRAP__ after reading it", async () => {
    const root: Record<string, unknown> = {
      __RED_BOOTSTRAP__: {
        target: "http://managed:5055",
        token: "mock-handoff-token",
        route: "/cluster",
      },
    };

    await expect(readInjectedGlobalBootstrap(root)).resolves.toEqual({
      target: "http://managed:5055",
      token: "mock-handoff-token",
      route: "/cluster",
    });
    expect(root).not.toHaveProperty("__RED_BOOTSTRAP__");
  });

  it("removes a consumed Open Contract token from URL history", () => {
    const location: UrlBootstrapLocation = {
      pathname: "/app",
      search: "?cs=http://managed:5055&to=/cluster",
      hash: "#token=mock-handoff-token&state=keep",
    };
    const replacements: string[] = [];
    const history: UrlBootstrapHistory = {
      state: { page: 1 },
      replaceState: (_data, _unused, url) => {
        replacements.push(String(url));
      },
    };

    expect(
      readUrlOpenContractBootstrap(location.search, location.hash, {
        consume: true,
        location,
        history,
      })
    ).toEqual({
      target: "http://managed:5055",
      token: "mock-handoff-token",
      route: "/cluster",
    });
    expect(replacements).toEqual([
      "/app?cs=http://managed:5055&to=/cluster#state=keep",
    ]);
  });

  it("strips a live hash token even when an injected global wins priority", async () => {
    const replaceState = vi.fn();
    vi.stubGlobal("location", {
      pathname: "/app",
      search: "?cs=http://hash-managed:5055",
      hash: "#token=hash-token",
    });
    vi.stubGlobal("history", {
      state: null,
      replaceState,
    });
    const root: Record<string, unknown> = {
      __RED_BOOTSTRAP__: {
        target: "http://global-managed:5055",
        token: "global-token",
      },
    };

    await expect(
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => readInjectedGlobalBootstrap(root),
        readPersisted: () => null,
      })
    ).resolves.toEqual({
      target: "http://global-managed:5055",
      token: "global-token",
    });
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/app?cs=http://hash-managed:5055"
    );
  });

  it("returns target null for a cold start with no source", async () => {
    await expect(
      resolveConnectionBootstrap({
        readTauri: () => null,
        readInjectedGlobal: () => null,
        readUrl: () => null,
        readPersisted: () => null,
      })
    ).resolves.toEqual({ target: null });
  });

  it("restores the persisted standalone target as the lowest-priority source", () => {
    expect(
      readPersistedLocalBootstrap(
        storageWith(
          JSON.stringify({
            url: "http://last-standalone:5055",
            label: "Last standalone",
          })
        )
      )
    ).toEqual({ target: "http://last-standalone:5055" });
  });
});
