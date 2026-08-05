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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkClass, lintKitFiles, lintKitSource } from "../tools/lint";
import { kitSourceFiles } from "../tools/paths";
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

  it("ignores the classes it has nothing to say about", () => {
    for (const className of [
      "inline-flex",
      "px-4",
      "gap-2",
      "font-medium",
      "leading-none",
    ]) {
      expect(check(className)).toBeNull();
    }
  });
});
