// The mechanical Primitive test.
//
// .red/CONTEXT.md defines a Primitive as "a Kit component that imports no
// other Kit component — the test is mechanical, by inspection", precisely so
// the primitives/composites split never becomes a debate (Spec #1's ninth user
// story). This file is that inspection, and it is the only authority on where
// a component belongs: read the imports, and if a component reaches for
// another component, it is a Composite and does not live here.
//
// Discovery is by file, not by list, so a seventh component dropped into
// src/primitives is judged the moment it exists.

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { PRIMITIVES } from "../src/index";
import { kitComponentFiles } from "../tools/paths";

const components = kitComponentFiles();

/** Every module specifier a file imports, static or dynamic. */
function importsOf(source: string): string[] {
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  return patterns.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[1]!)
  );
}

describe("the Kit's components", () => {
  it("are discovered, not assumed — the glob found files", () => {
    expect(components.length).toBeGreaterThan(0);
  });

  it("are exactly the ones the Kit's PRIMITIVES catalogue declares", () => {
    // The catalogue is what a consumer reads out of vendored source, with no
    // bundler to glob for them; this is what stops it drifting from the files.
    const onDisk = components.map((file) => basename(file, ".svelte")).sort();
    expect(onDisk).toEqual([...PRIMITIVES].sort());
  });
});

describe("every component in this Kit is a Primitive", () => {
  for (const file of components) {
    const name = basename(file);
    it(`${name} imports no other Kit component`, () => {
      const specifiers = importsOf(readFileSync(file, "utf8"));
      const componentImports = specifiers.filter((specifier) =>
        specifier.endsWith(".svelte")
      );
      expect(componentImports).toEqual([]);
    });

    it(`${name} does not reach back through the Kit's own entry point`, () => {
      // Importing the barrel would pull in every component transitively, which
      // is the same coupling wearing a different specifier.
      const specifiers = importsOf(readFileSync(file, "utf8"));
      const barrelImports = specifiers.filter(
        (specifier) =>
          specifier === "@reddb-io/kit-app" ||
          /(^|\/)index(\.ts)?$/.test(specifier)
      );
      expect(barrelImports).toEqual([]);
    });
  }
});
