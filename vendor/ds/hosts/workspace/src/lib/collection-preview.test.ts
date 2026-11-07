import { describe, expect, it, vi } from "vitest";

import {
  collectionPreviewQuery,
  fetchCollectionPreview,
} from "./collection-preview";
import type { QueryResult, RedClient } from "./reddb/index";

describe("collectionPreviewQuery", () => {
  it("uses LIST KV for native key-value collections", () => {
    expect(collectionPreviewQuery("rr_requests", "kv")).toBe(
      "LIST KV rr_requests LIMIT 200",
    );
  });

  it.each([
    ["red.config", "config", "LIST CONFIG red.config LIMIT 200"],
    ["app_settings", "config", "LIST CONFIG app_settings LIMIT 200"],
    ["red.vault", "vault", "LIST VAULT red.vault LIMIT 200"],
    ["credentials", "vault", "LIST VAULT credentials LIMIT 200"],
  ])(
    "reads %s using its catalog model rather than its key/value renderer",
    (collection, model, expected) => {
      expect(collectionPreviewQuery(collection, model)).toBe(expected);
    },
  );

  it.each(["table", "document", null, undefined])(
    "does not infer a KV model from key/value-shaped results (%s)",
    (model) => {
      expect(collectionPreviewQuery("settings", model)).toBe(
        "SELECT * FROM settings LIMIT 200",
      );
    },
  );

  it.each(["kv", "config", "vault", "table"])(
    "resolves the actual %s model before fetching a keyed preview",
    async (model) => {
      const query = vi.fn(
        async (sql: string) =>
          ({
            ok: true,
            query: sql,
            record_count: 1,
            result: {
              columns: [],
              records: [
                {
                  values: sql.includes("red.collections")
                    ? { model }
                    : { key: "mode", value: "safe" },
                },
              ],
            },
          }) as QueryResult,
      );
      const client = { query } as unknown as RedClient;
      const result = await fetchCollectionPreview(client, "app's_settings");
      expect(query.mock.calls[0][0]).toContain(
        "WHERE name = 'app''s_settings'",
      );
      const command =
        model === "table"
          ? "SELECT * FROM apps_settings"
          : `LIST ${model.toUpperCase()} apps_settings`;
      expect(query.mock.calls[1][0]).toBe(`${command} LIMIT 200`);
      expect(result.result.records[0].values).toEqual({
        key: "mode",
        value: "safe",
      });
    },
  );

  it("keeps a read-only SELECT fallback when the collection catalog cannot be read", async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes("red.collections"))
        throw new Error("catalog unavailable");
      return {
        ok: true,
        query: sql,
        record_count: 0,
        result: { columns: [], records: [] },
      } as QueryResult;
    });
    await fetchCollectionPreview(
      { query } as unknown as RedClient,
      "red.config",
    );
    expect(query.mock.calls.map(([sql]) => sql)).toEqual([
      "SELECT model FROM red.collections WHERE name = 'red.config' LIMIT 1",
      "SELECT * FROM red.config LIMIT 200",
    ]);
  });

  it.each(["Parse error: unexpected token", "unable to detect query mode"])(
    "preserves SELECT previews on older native-command parsers (%s)",
    async (message) => {
      const query = vi.fn(async (sql: string) => {
        if (sql.startsWith("LIST ")) throw new Error(message);
        return {
          ok: true,
          query: sql,
          record_count: 1,
          result: { columns: [], records: [{ values: { model: "vault" } }] },
        } as QueryResult;
      });
      await fetchCollectionPreview(
        { query } as unknown as RedClient,
        "red.vault",
      );
      expect(query.mock.calls.map(([sql]) => sql)).toEqual([
        "SELECT model FROM red.collections WHERE name = 'red.vault' LIMIT 1",
        "LIST VAULT red.vault LIMIT 200",
        "SELECT * FROM red.vault LIMIT 200",
      ]);
    },
  );

  it.each(["403 Forbidden", "INVALID_OPERATION: model mismatch"])(
    "does not retry a native read rejected with %s",
    async (message) => {
      const query = vi.fn(async (sql: string) => {
        if (sql.startsWith("LIST ")) throw new Error(message);
        return {
          ok: true,
          query: sql,
          record_count: 1,
          result: { columns: [], records: [{ values: { model: "config" } }] },
        } as QueryResult;
      });
      await expect(
        fetchCollectionPreview({ query } as unknown as RedClient, "red.config"),
      ).rejects.toThrow(message);
      expect(query).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps table-like collections on SELECT preview", () => {
    expect(collectionPreviewQuery("users", "table")).toBe(
      "SELECT * FROM users LIMIT 200",
    );
  });
});
