// The Kit's anti-hardcode lint — and the proof that it is worth running.
//
// A lint that only ever passes is indistinguishable from no lint, so the real
// Kit source and a deliberately offending fixture are checked side by side:
// the first must be clean, the second must be caught, offender by offender.
//
// This file IS acceptance criterion 2 of issue #7 ("each component's styling
// resolves through Theme/Tokens variables — the anti-hardcode lint passes on
// the Kit"), in the same way packages/theme/test/lint.test.ts is the Theme
// Layer's.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkClass, lintKitFiles, lintKitSource } from "../tools/lint";
import { KIT_ROOT, kitSourceFiles } from "../tools/paths";
import { readVocabulary } from "../tools/vocabulary";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(here, "fixtures");
const vocabulary = readVocabulary();

describe("the vocabulary the Kit may style with", () => {
  it("is read from the Layers' artifacts, not restated", () => {
    // The base Theme declares the semantic set; the @theme surface exposes it
    // as utilities. Both are generated, so this list moves when the Layers do.
    expect(vocabulary.colours).toEqual([
      "background",
      "foreground",
      "muted",
      "primary",
    ]);
    expect(vocabulary.radii).toEqual(["full", "lg", "md", "sm"]);
  });

  it("excludes primitives no Theme reassigns", () => {
    // `--color-neutral-900` is a real utility backed by a real token — and
    // frozen: a Kit built on it would not change when the Theme does.
    expect(vocabulary.colours).not.toContain("neutral-900");
    expect(vocabulary.colours).not.toContain("red-500");
  });

  it("carries the Density axis's roles, and the length each renders at", () => {
    // Read from the neutral stop and followed through to the Brand's scale —
    // so these are the lengths the Kit already ships in, which is exactly what
    // makes a fixed step recognisable as one the axis owns.
    expect(Object.keys(vocabulary.spatial).sort()).toEqual([
      "control-height-lg",
      "control-height-md",
      "control-height-sm",
      "gap-lg",
      "gap-md",
      "gap-sm",
      "inset-lg",
      "inset-md",
      "inset-sm",
    ]);
    expect(vocabulary.spatial["control-height-md"]).toBe("2.25rem"); // h-9
    expect(vocabulary.spatial["inset-md"]).toBe("1rem"); //             px-4
    expect(vocabulary.spatial["gap-md"]).toBe("0.5rem"); //             gap-2
  });
});

describe("anti-hardcode lint", () => {
  it("passes on every file of the real Kit", () => {
    const files = kitSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(lintKitFiles(files, vocabulary)).toEqual([]);
  });

  it("catches a Tailwind default colour, which no Theme reassigns", () => {
    const file = join(FIXTURES, "hardcoded.variants.ts");
    const violations = lintKitSource(
      readFileSync(file, "utf8"),
      file,
      vocabulary
    );
    expect(violations.map((violation) => violation.found)).toContain(
      "bg-blue-500"
    );
    expect(violations.map((violation) => violation.found)).toContain(
      "text-white"
    );
  });

  it("catches an arbitrary colour and an arbitrary radius", () => {
    const file = join(FIXTURES, "hardcoded.variants.ts");
    const violations = lintKitSource(
      readFileSync(file, "utf8"),
      file,
      vocabulary
    );
    const found = violations.map((violation) => violation.found);
    expect(found).toContain("bg-[#e5484d]");
    expect(found).toContain("rounded-[4px]");
    // The raw Brand hex inside the arbitrary value is reported in its own right.
    expect(found).toContain("#e5484d");
  });

  it("leaves the conforming classes in the same file alone", () => {
    const file = join(FIXTURES, "hardcoded.variants.ts");
    const found = lintKitSource(
      readFileSync(file, "utf8"),
      file,
      vocabulary
    ).map((v) => v.found);
    for (const clean of [
      "bg-primary",
      "text-background",
      "rounded-lg",
      "rounded-md",
      "inline-flex",
    ]) {
      expect(found).not.toContain(clean);
    }
  });

  it("catches a literal class attribute and a scoped <style> block", () => {
    const file = join(FIXTURES, "Hardcoded.svelte");
    const violations = lintKitSource(
      readFileSync(file, "utf8"),
      file,
      vocabulary
    );
    const found = violations.map((violation) => violation.found);
    expect(found).toContain("bg-black");
    expect(found).toContain("text-white");
    expect(found).toContain("<style>");
    expect(found).toContain("#e5484d");
    // `rounded-md` is a generated radius, so it is not among the offences.
    expect(found).not.toContain("rounded-md");
  });

  it("reports the line each offender is on", () => {
    const file = join(FIXTURES, "Hardcoded.svelte");
    const source = readFileSync(file, "utf8");
    const lines = source.split("\n");
    for (const violation of lintKitSource(source, file, vocabulary)) {
      const line = lines[violation.line - 1] ?? "";
      const needle = violation.found === "<style>" ? "<style" : violation.found;
      expect(line).toContain(needle);
    }
  });
});

describe("the spatial rule", () => {
  // ADR 0003's price, made mechanical: a Tailwind step compiles to a fixed
  // length, so a variant map written in steps is frozen against a density stop
  // exactly as one written in hex is frozen against a Theme. Issue #33 routed
  // the Kit; this is what stops it drifting back.
  const file = join(FIXTURES, "raw-spatial.variants.ts");
  const offenders = () =>
    lintKitSource(readFileSync(file, "utf8"), file, vocabulary).map(
      (violation) => violation.found
    );

  it("catches a fixed step the axis owns, in height, inset and gap alike", () => {
    const found = offenders();
    for (const step of ["h-9", "h-8", "px-3", "gap-1", "gap-2"]) {
      expect(found).toContain(step);
    }
  });

  it("names the role the offending step should have been written as", () => {
    const violations = lintKitSource(
      readFileSync(file, "utf8"),
      file,
      vocabulary
    );
    const reason = (found: string) =>
      violations.find((v) => v.found === found)?.reason ?? "";
    expect(reason("h-9")).toContain("--reddb-spatial-control-height-md");
    expect(reason("px-3")).toContain("--reddb-spatial-inset-sm");
    expect(reason("gap-2")).toContain("--reddb-spatial-gap-md");
  });

  it("catches a spatial value written as a length, or as a Brand step", () => {
    const found = offenders();
    // A raw length is the same freeze the step is, spelled out.
    for (const arbitrary of ["h-[2.75rem]", "px-[1.5rem]", "gap-[0.5rem]"]) {
      expect(found).toContain(arbitrary);
    }
    // A real token, and still frozen: a stop reassigns the roles, not the
    // Brand scale steps the roles land on.
    expect(found).toContain("py-[var(--reddb-space-6)]");
  });

  it("catches a role the Density axis does not declare", () => {
    // In a browser the variable resolves to nothing and the declaration is
    // dropped — a component silently missing its height.
    expect(offenders()).toContain("h-[var(--reddb-spatial-control-height-xl)]");
  });

  it("leaves the conforming and the unroutable classes in the same file alone", () => {
    const found = offenders();
    for (const clean of [
      "h-[var(--reddb-spatial-control-height-md)]",
      "px-[var(--reddb-spatial-inset-md)]",
      "gap-[var(--reddb-spatial-gap-md)]",
      // Values the axis ships no role at: routing them would either move what
      // the neutral renders or invent a role the Tokens Layer does not ship.
      "px-2",
      "py-0.5",
      "gap-1.5",
      "size-4",
      "w-full",
    ]) {
      expect(found).not.toContain(clean);
    }
  });
});

describe("the lint command", () => {
  // The library is what the tests above read; the command is what CI runs, and
  // a rule CI cannot fail on is not a contract. Both halves of the criterion
  // are asked of the command itself: the fixture fails it, the Kit passes it.
  const TSX = join(KIT_ROOT, "node_modules", ".bin", "tsx");
  const CLI = join(KIT_ROOT, "tools", "lint-cli.ts");
  const run = (...files: string[]) =>
    spawnSync(TSX, [CLI, ...files], { cwd: KIT_ROOT, encoding: "utf8" });

  it("exits non-zero on the committed raw-spatial fixture, naming every offender", () => {
    const { status, stderr } = run(join(FIXTURES, "raw-spatial.variants.ts"));
    expect(status).not.toBe(0);
    expect(stderr).toContain("h-9");
    expect(stderr).toContain("--reddb-spatial-control-height-md");
  }, 30_000);

  it("exits zero on the real Kit", () => {
    const { status, stdout } = run();
    expect(stdout).toContain("passed");
    expect(status).toBe(0);
  }, 30_000);
});

describe("what the lint reads in a single class name", () => {
  const check = (className: string) => checkClass(className, vocabulary);

  it("accepts a Theme-declared colour in every colour position", () => {
    for (const className of [
      "bg-primary",
      "text-foreground",
      "border-muted",
      "ring-primary",
      "fill-background",
    ]) {
      expect(check(className)).toBeNull();
    }
  });

  it("looks through variant modifiers and opacity, which are not values", () => {
    expect(check("hover:bg-primary")).toBeNull();
    expect(check("focus-visible:ring-primary")).toBeNull();
    expect(check("md:hover:text-muted")).toBeNull();
    expect(check("bg-primary/80")).toBeNull();
    // …and still catches what they were wrapped around.
    expect(check("hover:bg-blue-500")).not.toBeNull();
  });

  it("reads an ambiguous prefix by its suffix", () => {
    // Widths, sizes, sides and line styles are not colours, and the Brand
    // ships no token family for them yet.
    for (const className of [
      "border-2",
      "border-b",
      "border-dashed",
      "text-sm",
      "ring-2",
    ]) {
      expect(check(className)).toBeNull();
    }
    // Anything else after one of those prefixes is read as a colour.
    expect(check("text-black")).not.toBeNull();
    expect(check("border-white")).not.toBeNull();
  });

  it("accepts cascade keywords, which carry no Brand value", () => {
    for (const className of [
      "bg-transparent",
      "border-transparent",
      "outline-none",
    ]) {
      expect(check(className)).toBeNull();
    }
  });

  it("accepts a direct token reference as an arbitrary value, and nothing else", () => {
    expect(check("bg-[var(--reddb-color-primary)]")).toBeNull();
    expect(check("rounded-[var(--reddb-radius-lg)]")).toBeNull();
    expect(check("bg-[#fff]")).not.toBeNull();
    expect(check("rounded-[9999px]")).not.toBeNull();
  });

  it("checks every corner and side form of the radius utilities", () => {
    expect(check("rounded-tl-md")).toBeNull();
    expect(check("rounded-b-full")).toBeNull();
    expect(check("rounded-tl-huge")).not.toBeNull();
  });

  it("accepts a Density role in every spatial position", () => {
    for (const className of [
      "h-[var(--reddb-spatial-control-height-md)]",
      "min-h-[var(--reddb-spatial-control-height-sm)]",
      "px-[var(--reddb-spatial-inset-md)]",
      "pb-[var(--reddb-spatial-inset-sm)]",
      "gap-[var(--reddb-spatial-gap-lg)]",
    ]) {
      expect(check(className)).toBeNull();
    }
  });

  it("reads a spatial step against the family its position belongs to", () => {
    // 0.25rem is what gap-sm renders at, so `gap-1` is frozen — and `pt-1` is
    // not, because the axis ships no inset at 0.25rem to route it through.
    expect(check("gap-1")).not.toBeNull();
    expect(check("pt-1")).toBeNull();
    // …and the other way around: 2rem is a control height, never an inset.
    expect(check("h-8")).not.toBeNull();
    expect(check("py-8")).toBeNull();
  });

  it("says nothing about a position the axis ships no role for", () => {
    // Density shrinks components, not legibility (ADR 0003): an icon scale and
    // a rule's thickness are neither a control height, an inset nor a gap.
    for (const className of [
      "size-8",
      "w-9",
      "max-w-prose",
      "mt-4",
      "text-sm",
    ]) {
      expect(check(className)).toBeNull();
    }
  });

  it("looks through variant modifiers here too", () => {
    expect(check("md:h-[var(--reddb-spatial-control-height-lg)]")).toBeNull();
    expect(check("md:h-11")).not.toBeNull();
  });

  it("ignores the classes it has nothing to say about", () => {
    for (const className of [
      "inline-flex",
      "px-2",
      "gap-1.5",
      "font-medium",
      "leading-none",
    ]) {
      expect(check(className)).toBeNull();
    }
  });
});
