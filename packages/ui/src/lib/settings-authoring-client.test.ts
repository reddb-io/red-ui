import { describe, expect, it } from "vitest";
import type { QueryResult } from "./reddb/client";
import {
  SettingsAuthoringClient,
  parseShowConfigResult,
  parseShowSecretsResult,
  type QueryTransport,
} from "./settings-authoring-client";

function result(records: Array<Record<string, unknown>>): QueryResult {
  return {
    ok: true,
    query: "SHOW CONFIG",
    record_count: records.length,
    result: {
      columns: Object.keys(records[0] ?? {}),
      records: records.map((values) => ({ values })),
    },
  };
}

describe("parseShowConfigResult", () => {
  it("parses the confirmed live SHOW CONFIG projection: key + value", () => {
    expect(
      parseShowConfigResult(
        result([
          { key: "red.auth.enabled", value: false },
          { key: "red.server.max_scan_limit", value: 1000 },
        ])
      )
    ).toEqual([
      { key: "red.auth.enabled", value: false },
      { key: "red.server.max_scan_limit", value: 1000 },
    ]);
  });

  it("also accepts enriched config rows with value_type + schema_version", () => {
    expect(
      parseShowConfigResult(
        result([
          {
            collection: "red_config",
            key: "feature_flag",
            value: true,
            version: 3,
            value_type: "bool",
            schema_version: 2,
            tags: null,
            tombstone: false,
          },
        ])
      )
    ).toEqual([
      {
        collection: "red_config",
        key: "feature_flag",
        value: true,
        version: 3,
        valueType: "bool",
        schemaVersion: 2,
        tags: null,
      },
    ]);
  });

  it("tolerates alternate schema column spellings and skips tombstones", () => {
    expect(
      parseShowConfigResult(
        result([
          {
            key: "live",
            value: "ok",
            "value-type": "string",
            "schema-version": 1,
          },
          { key: "deleted", value: null, tombstone: true },
          { key: null, value: "ignored" },
        ])
      )
    ).toEqual([
      {
        key: "live",
        value: "ok",
        valueType: "string",
        schemaVersion: 1,
      },
    ]);
  });

  it("keeps secret references as references instead of resolving values", () => {
    expect(
      parseShowConfigResult(
        result([
          {
            key: "red.config.ai.openai.default.api_key",
            value: "&red.secret.ai.openai.default.api_key",
          },
          {
            key: "red.config.ai.openai.masked_api_key",
            value: "&***",
          },
        ])
      )
    ).toEqual([
      {
        key: "red.config.ai.openai.default.api_key",
        value: {
          type: "secret_ref",
          key: "red.secret.ai.openai.default.api_key",
        },
      },
      {
        key: "red.config.ai.openai.masked_api_key",
        value: { type: "secret_ref", key: "***", masked: true },
      },
    ]);
  });

  it("throws the server error when the query envelope is not ok", () => {
    expect(() =>
      parseShowConfigResult({
        ok: false,
        query: "SHOW CONFIG",
        record_count: 0,
        result: { columns: [], records: [] },
        error: "permission denied",
      })
    ).toThrow("permission denied");
  });
});

describe("parseShowSecretsResult", () => {
  it("parses metadata-only SHOW SECRETS rows sorted by key", () => {
    expect(
      parseShowSecretsResult(
        result([
          {
            key: "legacy.missing.key",
            value: "***",
            status: "restore_failed",
            version: 2,
          },
          {
            key: "mycompany.payments.key",
            value: "***",
            status: "active",
          },
        ])
      )
    ).toEqual([
      {
        key: "legacy.missing.key",
        value: "***",
        status: "restore_failed",
        version: 2,
      },
      {
        key: "mycompany.payments.key",
        value: "***",
        status: "active",
      },
    ]);
  });

  it("rejects plaintext secret values from SHOW SECRETS", () => {
    expect(() =>
      parseShowSecretsResult(
        result([{ key: "mycompany.payments.key", value: "sk-live-secret" }])
      )
    ).toThrow("unmasked secret value");
  });
});

describe("SettingsAuthoringClient", () => {
  it("reads SHOW CONFIG over the query transport", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([{ key: "red.auth.enabled", value: false }]);
      },
    };

    await expect(
      new SettingsAuthoringClient(transport).showConfig()
    ).resolves.toEqual([{ key: "red.auth.enabled", value: false }]);
    expect(calls).toEqual(["SHOW CONFIG"]);
  });

  it("passes a prefix when requested", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };

    await new SettingsAuthoringClient(transport).showConfig("red.ai");
    expect(calls).toEqual(["SHOW CONFIG red.ai"]);
  });

  it("rejects unsafe prefixes before calling the transport", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };

    await expect(
      new SettingsAuthoringClient(transport).showConfig("red.ai; DROP TABLE x")
    ).rejects.toThrow("dotted identifier path");
    expect(calls).toEqual([]);
  });

  it("reads SHOW SECRETS over the query transport", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([{ key: "mycompany.payments.key", value: "***" }]);
      },
    };

    await expect(
      new SettingsAuthoringClient(transport).showSecrets()
    ).resolves.toEqual([{ key: "mycompany.payments.key", value: "***" }]);
    expect(calls).toEqual(["SHOW SECRETS"]);
  });

  it("passes a SHOW SECRETS prefix when requested", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };

    await new SettingsAuthoringClient(transport).showSecrets(
      "mycompany.payments"
    );
    expect(calls).toEqual(["SHOW SECRETS mycompany.payments"]);
  });
});
