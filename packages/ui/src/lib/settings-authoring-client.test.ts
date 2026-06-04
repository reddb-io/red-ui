import { describe, expect, it } from "vitest";
import type { QueryResult } from "./reddb/client";
import {
  SettingsAuthoringClient,
  buildDeleteConfigStatement,
  buildDeleteSecretStatement,
  buildRevealSecretStatement,
  buildSetConfigStatement,
  buildSetSecretStatement,
  configValueToSqlLiteral,
  parseShowConfigResult,
  parseConfigMutationResult,
  parseRevealSecretResult,
  parseSecretMutationResult,
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

  it("sets and deletes secrets through SET/DELETE SECRET without echoing the value", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return {
          ok: true,
          query: sql,
          record_count: 1,
          result: {
            columns: ["message", "value"],
            records: [
              {
                values: {
                  message: "secret set",
                  value: "sk_live_secret",
                },
              },
            ],
          },
        };
      },
    };
    const client = new SettingsAuthoringClient(transport);

    const setResult = await client.setSecret(
      "mycompany.payments.key",
      "sk_live_secret"
    );
    const deleteResult = await client.deleteSecret("mycompany.payments.key");

    expect(calls).toEqual([
      "SET SECRET mycompany.payments.key = 'sk_live_secret'",
      "DELETE SECRET mycompany.payments.key",
    ]);
    expect(JSON.stringify(setResult)).not.toContain("sk_live_secret");
    expect(JSON.stringify(deleteResult)).not.toContain("sk_live_secret");
  });

  it("reveals a secret through UNSEAL VAULT without using SHOW SECRETS", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([
          { key: "mycompany.payments.key", value: "sk_live_secret" },
        ]);
      },
    };

    await expect(
      new SettingsAuthoringClient(transport).revealSecret(
        "mycompany.payments.key"
      )
    ).resolves.toEqual({
      key: "mycompany.payments.key",
      value: "sk_live_secret",
    });
    expect(calls).toEqual(["UNSEAL VAULT mycompany.payments.key"]);
  });

  it("rejects unsafe reveal keys before calling the transport", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };

    await expect(
      new SettingsAuthoringClient(transport).revealSecret(
        "mycompany.payments.key; SHOW SECRETS"
      )
    ).rejects.toThrow("dotted identifier path");
    expect(calls).toEqual([]);
  });

  it("sets config through SET CONFIG with typed literals", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([{ message: "config set" }]);
      },
    };

    await new SettingsAuthoringClient(transport).setConfig(
      "red.auth.enabled",
      true
    );
    await new SettingsAuthoringClient(transport).setConfig(
      "red.ai.default.provider",
      "o'hara"
    );
    await new SettingsAuthoringClient(transport).setConfig(
      "red.vcs.protected_branches",
      ["main", "release"]
    );

    expect(calls).toEqual([
      "SET CONFIG red.auth.enabled = true",
      "SET CONFIG red.ai.default.provider = 'o''hara'",
      'SET CONFIG red.vcs.protected_branches = ["main","release"]',
    ]);
  });

  it("unsets config through DELETE CONFIG collection key", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([{ message: "config deleted" }]);
      },
    };

    await new SettingsAuthoringClient(transport).unsetConfig(
      "red.server.max_scan_limit"
    );

    expect(calls).toEqual(["DELETE CONFIG red.server max_scan_limit"]);
  });

  it("rejects unsafe config mutation keys before calling the transport", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };
    const client = new SettingsAuthoringClient(transport);

    await expect(
      client.setConfig("red.auth.enabled; DROP TABLE x", false)
    ).rejects.toThrow("dotted identifier path");
    await expect(client.unsetConfig("single")).rejects.toThrow(
      "collection and key"
    );
    expect(calls).toEqual([]);
  });
});

describe("config mutation SQL helpers", () => {
  it("builds SET/DELETE CONFIG statements without transport side effects", () => {
    expect(buildSetConfigStatement("red.auth.enabled", false)).toBe(
      "SET CONFIG red.auth.enabled = false"
    );
    expect(buildSetConfigStatement("red.server.max_scan_limit", 2500)).toBe(
      "SET CONFIG red.server.max_scan_limit = 2500"
    );
    expect(buildDeleteConfigStatement("durability.mode")).toBe(
      "DELETE CONFIG durability mode"
    );
  });

  it("serializes supported config literals", () => {
    expect(configValueToSqlLiteral(null)).toBe("NULL");
    expect(configValueToSqlLiteral({ a: 1, b: true })).toBe('{"a":1,"b":true}');
    expect(() => configValueToSqlLiteral(Number.NaN)).toThrow("finite");
  });

  it("parses config mutation envelopes and surfaces server failures", () => {
    expect(
      parseConfigMutationResult(result([{ message: "ok" }]), "SET CONFIG").ok
    ).toBe(true);
    expect(() =>
      parseConfigMutationResult(
        {
          ok: false,
          query: "DELETE CONFIG red.auth enabled",
          record_count: 0,
          result: { columns: [], records: [] },
          error: "permission denied",
        },
        "DELETE CONFIG"
      )
    ).toThrow("permission denied");
  });
});

describe("secret mutation SQL helpers", () => {
  it("builds SET/DELETE SECRET statements and escapes literal values", () => {
    expect(buildSetSecretStatement("mycompany.payments.key", "sk_live")).toBe(
      "SET SECRET mycompany.payments.key = 'sk_live'"
    );
    expect(buildSetSecretStatement("mycompany.payments.key", "o'hara")).toBe(
      "SET SECRET mycompany.payments.key = 'o''hara'"
    );
    expect(buildDeleteSecretStatement("mycompany.payments.key")).toBe(
      "DELETE SECRET mycompany.payments.key"
    );
  });

  it("rejects unsafe secret keys before query transport sees them", async () => {
    const calls: string[] = [];
    const transport: QueryTransport = {
      async query(sql) {
        calls.push(sql);
        return result([]);
      },
    };
    const client = new SettingsAuthoringClient(transport);

    await expect(
      client.setSecret("mycompany.payments.key; DROP TABLE x", "sk")
    ).rejects.toThrow("dotted identifier path");
    await expect(
      client.deleteSecret("mycompany.payments.key; DROP TABLE x")
    ).rejects.toThrow("dotted identifier path");
    expect(calls).toEqual([]);
  });

  it("redacts successful secret mutation envelopes and surfaces failures", () => {
    const parsed = parseSecretMutationResult(
      {
        ok: true,
        query: "SET SECRET mycompany.payments.key = 'sk_live_secret'",
        record_count: 1,
        result: {
          columns: ["value"],
          records: [{ values: { value: "sk_live_secret" } }],
        },
      },
      "SET SECRET"
    );

    expect(parsed).toEqual({
      ok: true,
      query: "SET SECRET",
      record_count: 0,
      result: { columns: [], records: [] },
    });
    expect(JSON.stringify(parsed)).not.toContain("sk_live_secret");
    expect(() =>
      parseSecretMutationResult(
        {
          ok: false,
          query: "DELETE SECRET mycompany.payments.key",
          record_count: 0,
          result: { columns: [], records: [] },
          error: "permission denied",
        },
        "DELETE SECRET"
      )
    ).toThrow("permission denied");
  });
});

describe("secret reveal SQL helpers", () => {
  it("builds UNSEAL VAULT statements", () => {
    expect(buildRevealSecretStatement("mycompany.payments.key")).toBe(
      "UNSEAL VAULT mycompany.payments.key"
    );
  });

  it("parses plaintext from supported UNSEAL VAULT result columns", () => {
    expect(
      parseRevealSecretResult(
        result([{ key: "mycompany.payments.value", value: "from-value" }]),
        "mycompany.payments.value"
      )
    ).toEqual({ key: "mycompany.payments.value", value: "from-value" });
    expect(
      parseRevealSecretResult(
        result([
          { key: "mycompany.payments.plaintext", plaintext: "from-plaintext" },
        ]),
        "mycompany.payments.plaintext"
      )
    ).toEqual({
      key: "mycompany.payments.plaintext",
      value: "from-plaintext",
    });
    expect(
      parseRevealSecretResult(
        result([{ key: "mycompany.payments.secret", secret: "from-secret" }]),
        "mycompany.payments.secret"
      )
    ).toEqual({ key: "mycompany.payments.secret", value: "from-secret" });
  });

  it("surfaces UNSEAL VAULT failures and missing plaintext", () => {
    expect(() =>
      parseRevealSecretResult(
        {
          ok: false,
          query: "UNSEAL VAULT mycompany.payments.key",
          record_count: 0,
          result: { columns: [], records: [] },
          error: "permission denied",
        },
        "mycompany.payments.key"
      )
    ).toThrow("permission denied");
    expect(() =>
      parseRevealSecretResult(
        result([{ key: "mycompany.payments.key" }]),
        "mycompany.payments.key"
      )
    ).toThrow("UNSEAL VAULT returned no plaintext value");
  });
});
