import { describe, expect, it } from "vitest";
import type { ConfigEntry } from "./settings-authoring-client";
import {
  ENUM_OPTIONS,
  SETTINGS_PANES,
  filterConfigEntries,
  humanizeKey,
  resolveConfigControl,
  resolvePane,
} from "./settings-sections";

describe("settings panes registry", () => {
  it("ships only real panes with stable, unique ids", () => {
    expect(SETTINGS_PANES.map((pane) => pane.id)).toEqual(["config"]);
    const ids = SETTINGS_PANES.map((pane) => pane.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const pane of SETTINGS_PANES) {
      expect(pane.label).not.toBe("");
      expect(pane.blurb).not.toBe("");
      expect(pane.icon).not.toBe("");
    }
  });

  it("resolves a pane by id and falls back to Config", () => {
    expect(resolvePane("config")).toBe(SETTINGS_PANES[0]);
    expect(resolvePane("missing")).toBe(SETTINGS_PANES[0]);
    expect(resolvePane(null)).toBe(SETTINGS_PANES[0]);
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
});
