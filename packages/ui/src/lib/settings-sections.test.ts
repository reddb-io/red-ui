import { describe, expect, it } from "vitest";
import type { ConfigEntry, SecretEntry } from "./settings-authoring-client";
import {
  ENUM_OPTIONS,
  SETTINGS_PANES,
  filterConfigEntries,
  filterSecretEntries,
  filterSettingsPanesByGrant,
  humanizeKey,
  initialConfigEditValue,
  parseConfigEditValue,
  resolveConfigControl,
  resolvePane,
  resolveSecretControl,
} from "./settings-sections";

describe("settings panes registry", () => {
  it("ships only real panes with stable, unique ids", () => {
    expect(SETTINGS_PANES.map((pane) => pane.id)).toEqual([
      "config",
      "secrets",
    ]);
    const ids = SETTINGS_PANES.map((pane) => pane.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pane of SETTINGS_PANES) {
      expect(pane.label).not.toBe("");
      expect(pane.blurb).not.toBe("");
      expect(pane.icon).not.toBe("");
      expect(pane.readGrant.action).not.toBe("");
      expect(pane.readGrant.resource.kind).not.toBe("");
      expect(pane.readGrant.resource.name).not.toBe("");
    }
    expect(SETTINGS_PANES[0].writeGrant).toEqual({
      action: "config:write",
      resource: { kind: "config", name: "*" },
    });
    expect(SETTINGS_PANES[1].writeGrant).toEqual({
      action: "vault:write",
      resource: { kind: "vault", name: "*" },
    });
  });

  it("resolves a pane by id and falls back to Config", () => {
    expect(resolvePane("config")).toBe(SETTINGS_PANES[0]);
    expect(resolvePane("missing")).toBe(SETTINGS_PANES[0]);
    expect(resolvePane(null)).toBe(SETTINGS_PANES[0]);
  });

  it("filters panes by cached read grants", () => {
    expect(
      filterSettingsPanesByGrant(SETTINGS_PANES, { cachedCan: () => true }).map(
        (pane) => pane.id
      )
    ).toEqual(["config", "secrets"]);
    expect(
      filterSettingsPanesByGrant(SETTINGS_PANES, {
        cachedCan: (check) => check.action !== "config:read",
      }).map((pane) => pane.id)
    ).toEqual(["secrets"]);
  });
});

describe("resolveConfigControl", () => {
  const entry = (overrides: Partial<ConfigEntry>): ConfigEntry => ({
    key: "red.auth.enabled",
    value: false,
    ...overrides,
  });

  it("layers curated labels and descriptions over the live key", () => {
    const control = resolveConfigControl(entry({ key: "red.auth.enabled" }));
    expect(control.label).toBe("Authentication");
    expect(control.description).toContain("authentication");
  });

  it("resolves enum kind + options from curated key data", () => {
    const control = resolveConfigControl(
      entry({ key: "durability.mode", value: "sync", valueType: "string" })
    );
    expect(control.kind).toBe("enum");
    expect(control.options).toEqual(ENUM_OPTIONS["durability.mode"]);
  });

  it("uses SHOW CONFIG value_type before runtime fallback", () => {
    expect(
      resolveConfigControl(entry({ value: "true", valueType: "bool" })).kind
    ).toBe("boolean");
    expect(
      resolveConfigControl(entry({ value: "42", valueType: "int" })).kind
    ).toBe("number");
    expect(
      resolveConfigControl(entry({ value: "[1,2]", valueType: "array" })).kind
    ).toBe("list");
  });

  it("falls back to runtime value shape when SHOW CONFIG omits schema columns", () => {
    expect(resolveConfigControl(entry({ value: true })).kind).toBe("boolean");
    expect(resolveConfigControl(entry({ value: 42 })).kind).toBe("number");
    expect(resolveConfigControl(entry({ value: ["main"] })).kind).toBe("list");
    expect(resolveConfigControl(entry({ value: "reddb" })).kind).toBe("text");
  });

  it("carries schema metadata when present", () => {
    const control = resolveConfigControl(
      entry({ valueType: "bool", schemaVersion: 2 })
    );
    expect(control.valueType).toBe("bool");
    expect(control.schemaVersion).toBe(2);
  });

  it("renders secret references as references", () => {
    const control = resolveConfigControl(
      entry({
        key: "red.config.ai.openai.default.api_key",
        value: {
          type: "secret_ref",
          key: "red.secret.ai.openai.default.api_key",
        },
      })
    );

    expect(control.kind).toBe("secret-reference");
    expect(control.secretReference).toEqual({
      type: "secret_ref",
      key: "red.secret.ai.openai.default.api_key",
    });
  });
});

describe("resolveSecretControl", () => {
  it("marks vault rows as masked controls", () => {
    expect(
      resolveSecretControl({
        key: "mycompany.payments.stripe.key",
        value: "***",
        status: "active",
      })
    ).toMatchObject({
      key: "mycompany.payments.stripe.key",
      kind: "text",
      masked: true,
    });
  });
});

describe("config edit value validation", () => {
  const control = (
    overrides: Partial<ConfigEntry>
  ): ReturnType<typeof resolveConfigControl> =>
    resolveConfigControl({
      key: "red.auth.enabled",
      value: false,
      ...overrides,
    });

  it("prepares existing values for editable controls", () => {
    expect(initialConfigEditValue({ key: "x", value: true })).toBe("true");
    expect(initialConfigEditValue({ key: "x", value: ["main"] })).toBe(
      '[\n  "main"\n]'
    );
  });

  it("validates boolean, number, enum, list, and text values before submit", () => {
    expect(parseConfigEditValue(control({ value: false }), "true")).toEqual({
      ok: true,
      value: true,
    });
    expect(
      parseConfigEditValue(control({ value: 10, valueType: "int" }), "12.5")
    ).toEqual({ ok: true, value: 12.5 });
    expect(
      parseConfigEditValue(
        control({ key: "durability.mode", value: "sync" }),
        "async"
      )
    ).toEqual({ ok: true, value: "async" });
    expect(
      parseConfigEditValue(control({ value: ["main"] }), '["main","release"]')
    ).toEqual({ ok: true, value: ["main", "release"] });
    expect(parseConfigEditValue(control({ value: "reddb" }), " red ")).toEqual({
      ok: true,
      value: " red ",
    });
  });

  it("rejects invalid values by control kind", () => {
    expect(
      parseConfigEditValue(control({ value: false }), "yes").error
    ).toMatch(/true or false/);
    expect(
      parseConfigEditValue(control({ value: 10, valueType: "int" }), "nan")
        .error
    ).toMatch(/finite/);
    expect(
      parseConfigEditValue(
        control({ key: "durability.mode", value: "sync" }),
        "eventual"
      ).error
    ).toMatch(/allowed/);
    expect(
      parseConfigEditValue(control({ value: ["main"] }), "{}").error
    ).toMatch(/array/);
  });
});

describe("humanizeKey", () => {
  it("uses the last dotted segment, de-snakes, and sentence-cases", () => {
    expect(humanizeKey("red.storage.page_size")).toBe("Page size");
    expect(humanizeKey("read_only")).toBe("Read only");
    expect(humanizeKey("system.cpu-cores")).toBe("Cpu cores");
  });
});

describe("filterConfigEntries (per-pane search)", () => {
  const entries: ConfigEntry[] = [
    { key: "red.auth.enabled", value: false },
    { key: "red.server.max_body_size", value: 1048576 },
    { key: "durability.mode", value: "sync" },
  ];

  it("returns all entries (a copy) for an empty or whitespace query", () => {
    expect(filterConfigEntries(entries, "")).toEqual(entries);
    expect(filterConfigEntries(entries, "   ")).toEqual(entries);
    expect(filterConfigEntries(entries, "")).not.toBe(entries);
  });

  it("matches config keys case-insensitively", () => {
    expect(
      filterConfigEntries(entries, "SERVER").map((entry) => entry.key)
    ).toEqual(["red.server.max_body_size"]);
  });

  it("matches curated human labels", () => {
    expect(
      filterConfigEntries(entries, "authentication").map((entry) => entry.key)
    ).toEqual(["red.auth.enabled"]);
    expect(
      filterConfigEntries(entries, "durability").map((entry) => entry.key)
    ).toEqual(["durability.mode"]);
  });

  it("matches secret reference targets without resolving them", () => {
    expect(
      filterConfigEntries(
        [
          ...entries,
          {
            key: "red.config.ai.openai.default.api_key",
            value: {
              type: "secret_ref",
              key: "red.secret.ai.openai.default.api_key",
            },
          },
        ],
        "secret.ai"
      ).map((entry) => entry.key)
    ).toEqual(["red.config.ai.openai.default.api_key"]);
  });
});

describe("filterSecretEntries (per-pane search)", () => {
  const entries: SecretEntry[] = [
    { key: "mycompany.payments.stripe.key", value: "***", status: "active" },
    { key: "legacy.missing.key", value: "***", status: "restore_failed" },
  ];

  it("returns all entries (a copy) for an empty or whitespace query", () => {
    expect(filterSecretEntries(entries, "")).toEqual(entries);
    expect(filterSecretEntries(entries, "   ")).toEqual(entries);
    expect(filterSecretEntries(entries, "")).not.toBe(entries);
  });

  it("matches secret keys and metadata case-insensitively", () => {
    expect(
      filterSecretEntries(entries, "PAYMENTS").map((entry) => entry.key)
    ).toEqual(["mycompany.payments.stripe.key"]);
    expect(
      filterSecretEntries(entries, "restore").map((entry) => entry.key)
    ).toEqual(["legacy.missing.key"]);
  });
});
