import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSISTED_CONNECTION_KEY,
  readPersistedLocalBootstrap,
  readUrlOpenContractBootstrap,
  resolveConnectionBootstrap,
  type BootstrapStorage,
} from "./connection-bootstrap";

function storageWith(value: string | null): BootstrapStorage {
  return {
    getItem: (key) => (key === DEFAULT_PERSISTED_CONNECTION_KEY ? value : null),
  };
}

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
