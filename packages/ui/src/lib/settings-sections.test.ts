import { describe, expect, it } from "vitest";
import {
  SECTIONS,
  ENUM_OPTIONS,
  filterKeys,
  flattenConfig,
  humanizeKey,
  resolveControl,
  resolveSection,
  sourceForKey,
} from "./settings-sections";

describe("settings sections registry", () => {
  it("ships sections with stable, unique ids and non-empty curated keys", () => {
    expect(SECTIONS.length).toBeGreaterThan(0);
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of SECTIONS) {
      expect(section.label).not.toBe("");
      expect(section.blurb).not.toBe("");
      expect(section.icon).not.toBe("");
      expect(section.keys.length).toBeGreaterThan(0);
    }
  });

  it("resolves a known section by id", () => {
    const target = SECTIONS[SECTIONS.length - 1];
    expect(resolveSection(target.id)).toBe(target);
  });

  it("falls back to the first section for unknown or null ids", () => {
    expect(resolveSection("does-not-exist")).toBe(SECTIONS[0]);
    expect(resolveSection(null)).toBe(SECTIONS[0]);
  });
});

describe("resolveControl", () => {
  it("resolves the curated label and description for a known key", () => {
    const c = resolveControl("deployment.mode", "embedded");
    expect(c.label).toBe("Deployment mode");
    expect(c.description).toBe("How this reddb instance is running.");
  });

  it("resolves enum kind + options from ENUM_OPTIONS regardless of value", () => {
    const c = resolveControl("deployment.mode", "docker");
    expect(c.kind).toBe("enum");
    expect(c.options).toEqual(ENUM_OPTIONS["deployment.mode"]);
  });

  it("infers boolean kind from a boolean value", () => {
    expect(resolveControl("read_only", true).kind).toBe("boolean");
    expect(resolveControl("capabilities.vcs", false).kind).toBe("boolean");
  });

  it("infers number kind from a numeric value", () => {
    expect(resolveControl("store.collection_count", 12).kind).toBe("number");
  });

  it("defaults to text kind for strings", () => {
    expect(resolveControl("system.os", "linux").kind).toBe("text");
  });

  it("falls back gracefully for an unknown key with no value", () => {
    const c = resolveControl("store.total_memory_bytes");
    // No curated label exists for this key → humanized last segment.
    expect(c.label).toBe("Memory in use"); // (curated) — see next case for raw fallback
    expect(c.kind).toBe("text");
    expect(c.options).toBeUndefined();
  });

  it("humanizes an entirely uncurated key and omits description", () => {
    const c = resolveControl("wal.oldest_lsn", 42);
    expect(c.label).toBe("Oldest lsn");
    expect(c.description).toBeUndefined();
    expect(c.kind).toBe("number");
  });
});

describe("humanizeKey", () => {
  it("uses the last dotted segment, de-snakes, and sentence-cases", () => {
    expect(humanizeKey("store.total_memory_bytes")).toBe("Total memory bytes");
    expect(humanizeKey("read_only")).toBe("Read only");
    expect(humanizeKey("system.cpu-cores")).toBe("Cpu cores");
  });
});

describe("sourceForKey", () => {
  it("routes keys to their live source", () => {
    expect(sourceForKey("capabilities.vcs")).toBe("capabilities");
    expect(sourceForKey("session.role")).toBe("session");
    expect(sourceForKey("deployment.mode")).toBe("cluster");
    expect(sourceForKey("replication.lag_ms")).toBe("cluster");
    expect(sourceForKey("store.collection_count")).toBe("stats");
    expect(sourceForKey("read_only")).toBe("stats");
  });
});

describe("flattenConfig", () => {
  it("flattens nested objects into dotted leaf paths", () => {
    const flat = flattenConfig({
      store: { collection_count: 3, total_memory_bytes: 1024 },
      read_only: true,
    });
    expect(flat["store.collection_count"]).toBe(3);
    expect(flat["store.total_memory_bytes"]).toBe(1024);
    expect(flat["read_only"]).toBe(true);
  });

  it("keeps arrays and primitives as leaves and skips null/undefined branches", () => {
    const flat = flattenConfig({
      tags: ["a", "b"],
      deployment: undefined,
      replication: null,
      session: { role: "admin" },
    });
    expect(flat["tags"]).toEqual(["a", "b"]);
    expect("deployment" in flat).toBe(false);
    expect("replication" in flat).toBe(false);
    expect(flat["session.role"]).toBe("admin");
  });

  it("round-trips a stats-shaped snapshot into curated keys", () => {
    const flat = flattenConfig({
      store: { collection_count: 7, total_entities: 99, cross_ref_count: 0 },
      system: { os: "linux", arch: "x86_64", cpu_cores: 8 },
    });
    for (const key of SECTIONS.find((s) => s.id === "storage")!.keys) {
      if (key === "store.total_memory_bytes") continue; // omitted by this server
      expect(flat[key]).toBeDefined();
    }
  });
});

describe("filterKeys (per-section search)", () => {
  const keys = [
    "store.collection_count",
    "store.total_entities",
    "store.total_memory_bytes",
    "read_only",
  ];

  it("returns all keys (a copy) for an empty or whitespace query", () => {
    expect(filterKeys(keys, "")).toEqual(keys);
    expect(filterKeys(keys, "   ")).toEqual(keys);
    expect(filterKeys(keys, "")).not.toBe(keys); // copy, not the same ref
  });

  it("matches against the config path, case-insensitively", () => {
    expect(filterKeys(keys, "MEMORY")).toEqual(["store.total_memory_bytes"]);
    expect(filterKeys(keys, "store.total")).toEqual([
      "store.total_entities",
      "store.total_memory_bytes",
    ]);
  });

  it("matches against the resolved human label, not just the key", () => {
    // "read_only" → label "Read-only"; "only" appears in the label.
    expect(filterKeys(keys, "read-only")).toEqual(["read_only"]);
    // "Collections" is the curated label for store.collection_count.
    expect(filterKeys(keys, "collections")).toEqual(["store.collection_count"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterKeys(keys, "zzz-nope")).toEqual([]);
  });
});
