import { describe, expect, it } from "vitest";
import { SETTINGS_SECTIONS, resolveSection } from "./settings-sections";

describe("settings sections", () => {
  it("ships at least one static section with stable ids", () => {
    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(0);
    const ids = SETTINGS_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of SETTINGS_SECTIONS) {
      expect(section.label).not.toBe("");
      expect(section.body).not.toBe("");
    }
  });

  it("resolves a known section by id", () => {
    const target = SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1];
    expect(resolveSection(target.id)).toBe(target);
  });

  it("falls back to the first section for unknown or null ids", () => {
    expect(resolveSection("does-not-exist")).toBe(SETTINGS_SECTIONS[0]);
    expect(resolveSection(null)).toBe(SETTINGS_SECTIONS[0]);
  });
});
