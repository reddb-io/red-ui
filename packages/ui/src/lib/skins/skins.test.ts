import { describe, expect, it } from "vitest";
import {
  DEFAULT_SKIN,
  SKINS,
  skinByName,
  skinToCssVars,
  type Skin,
} from "./skins";

/** Pull the lift percentage out of a `color-mix(in srgb, <lift> P%, <base>)`. */
function liftPct(expr: string): number {
  const m = expr.match(/color-mix\(in srgb, \S+ ([\d.]+)%/);
  expect(m, `expected a color-mix expression, got: ${expr}`).not.toBeNull();
  return Number(m![1]);
}

describe("skinToCssVars — pure seed → CSS-var mapping", () => {
  it("produces the full custom-property set", () => {
    const vars = skinToCssVars(DEFAULT_SKIN);
    const expected = [
      "--color-bg-0",
      "--color-bg-1",
      "--color-bg-2",
      "--color-bg-3",
      "--color-fg-0",
      "--color-fg-1",
      "--color-fg-2",
      "--color-fg-3",
      "--color-line-1",
      "--color-line-2",
      "--color-line-3",
      "--color-accent",
      "--color-accent-soft",
      "--color-accent-glow",
      "--color-ambient-glow",
      "--color-role-primary",
      "--font-sans",
      "--font-mono",
    ];
    for (const key of expected) expect(vars).toHaveProperty(key);
  });

  it("keeps bg-0 exactly the seed (the deepest base)", () => {
    const vars = skinToCssVars(DEFAULT_SKIN);
    expect(vars["--color-bg-0"]).toBe(DEFAULT_SKIN.colors.bg);
  });

  it("derives a monotonic bg-0..bg-3 surface ramp via color-mix", () => {
    // bg-1..bg-3 lift an increasing fraction of white off the bg seed; in the
    // sRGB space color-mix is linear, so a strictly increasing white fraction
    // means strictly increasing luminance — a monotonic ramp.
    for (const skin of SKINS) {
      const vars = skinToCssVars(skin);
      expect(vars["--color-bg-0"]).toBe(skin.colors.bg);
      for (const v of ["--color-bg-1", "--color-bg-2", "--color-bg-3"]) {
        expect(vars[v]).toContain("color-mix(in srgb, #ffffff");
        expect(vars[v]).toContain(skin.colors.bg);
      }
      const lifts = [
        liftPct(vars["--color-bg-1"]),
        liftPct(vars["--color-bg-2"]),
        liftPct(vars["--color-bg-3"]),
      ];
      expect(lifts[0]).toBeLessThan(lifts[1]);
      expect(lifts[1]).toBeLessThan(lifts[2]);
    }
  });

  it("derives a monotonic fg-0..fg-3 text ramp fading toward bg", () => {
    for (const skin of SKINS) {
      const vars = skinToCssVars(skin);
      // fg-0 is the pure seed; lower levels mix a *decreasing* fraction of fg
      // into bg, so readability steps down monotonically.
      expect(vars["--color-fg-0"]).toBe(skin.colors.fg);
      const mixes = [
        liftPct(vars["--color-fg-1"]),
        liftPct(vars["--color-fg-2"]),
        liftPct(vars["--color-fg-3"]),
      ];
      expect(mixes[0]).toBeGreaterThan(mixes[1]);
      expect(mixes[1]).toBeGreaterThan(mixes[2]);
    }
  });

  it("derives accent washes from the accent seed via color-mix with transparent", () => {
    const vars = skinToCssVars(DEFAULT_SKIN);
    const accent = DEFAULT_SKIN.colors.accent;
    expect(vars["--color-accent"]).toBe(accent);
    expect(vars["--color-accent-soft"]).toBe(
      `color-mix(in srgb, ${accent} 12%, transparent)`
    );
    expect(vars["--color-accent-glow"]).toBe(
      `color-mix(in srgb, ${accent} 45%, transparent)`
    );
    expect(vars["--color-role-primary"]).toBe(accent);
  });

  it("maps typography straight through", () => {
    const vars = skinToCssVars(DEFAULT_SKIN);
    expect(vars["--font-sans"]).toBe(DEFAULT_SKIN.typography.sans);
    expect(vars["--font-mono"]).toBe(DEFAULT_SKIN.typography.mono);
  });
});

describe("SKINS registry", () => {
  it("ships 1–2 curated dark skins (not a buffet)", () => {
    expect(SKINS.length).toBeGreaterThanOrEqual(1);
    expect(SKINS.length).toBeLessThanOrEqual(2);
  });

  it("has unique skin names", () => {
    const names = SKINS.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("default skin preserves the #ff2056 accent", () => {
    expect(DEFAULT_SKIN.name).toBe("reddb");
    expect(DEFAULT_SKIN.colors.accent).toBe("#ff2056");
    expect(skinToCssVars(DEFAULT_SKIN)["--color-accent"]).toBe("#ff2056");
  });

  it("every skin produces a complete, valid var set", () => {
    for (const skin of SKINS) {
      const vars = skinToCssVars(skin);
      expect(Object.keys(vars).length).toBeGreaterThan(0);
      for (const value of Object.values(vars)) expect(value).toBeTruthy();
    }
  });
});

describe("skinByName", () => {
  it("resolves a known skin", () => {
    expect(skinByName("nocturne").name).toBe("nocturne");
  });

  it("falls back to the default for unknown / nullish names", () => {
    const cases: (string | null | undefined)[] = [
      "does-not-exist",
      null,
      undefined,
      "",
    ];
    for (const c of cases) expect(skinByName(c)).toBe(DEFAULT_SKIN);
  });
});

// Adding a skin must be a single data entry — no render-code change. Guard the
// shape so a new entry can't silently drop a required field.
describe("adding a skin is data-only", () => {
  it("every entry satisfies the Skin contract", () => {
    for (const skin of SKINS as readonly Skin[]) {
      expect(typeof skin.name).toBe("string");
      expect(typeof skin.label).toBe("string");
      expect(typeof skin.description).toBe("string");
      expect(typeof skin.colors.bg).toBe("string");
      expect(typeof skin.colors.accent).toBe("string");
      expect(typeof skin.colors.fg).toBe("string");
      expect(typeof skin.typography.sans).toBe("string");
      expect(typeof skin.typography.mono).toBe("string");
    }
  });
});
