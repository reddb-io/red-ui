// The vocabulary the Kit is allowed to style with — read from the Layers'
// generated artifacts, never restated here.
//
// Two artifacts answer two different questions:
//
//   theme.css (the Tailwind 4 @theme surface) — which utilities exist at all.
//              `--color-primary` there is what makes `bg-primary` a class.
//   base.css  (the base Theme's value set)    — which of those a Theme owns.
//              A Theme reassigns exactly the semantic tokens it declares.
//
// A Kit may only name colours in the intersection. The @theme surface alone
// would admit `bg-neutral-900`: a real token, resolving through a real
// `--reddb-*` variable — and frozen, because no Theme reassigns it. A Kit
// built on it would render identically under base and dark, which is the exact
// failure this Kit's showcase routes exist to make visible. Requiring the
// colour to be Theme-declared is therefore the mechanical form of "styling
// resolves through Theme/Tokens variables".
//
// Radius has no such distinction: the Themes reassign no radius token, so the
// @theme surface is the whole vocabulary.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

/** The styling names the Layers make available to a Kit. */
export interface Vocabulary {
  /** Colour utility names, e.g. "primary" — Theme-declared and utility-backed. */
  colours: readonly string[];
  /** Radius utility names, e.g. "md". */
  radii: readonly string[];
}

// Resolve through the Theme package's `exports` map rather than by walking up
// the tree: the artifact's location is the Theme Layer's business, and a
// hand-built relative path would be the one hardcoded value in the linter.
const resolve = createRequire(import.meta.url).resolve;

function readArtifact(specifier: string): string {
  return readFileSync(resolve(specifier), "utf8");
}

/** Custom-property names declared in `css`, with `prefix` stripped. */
function declaredNames(css: string, prefix: string): string[] {
  const pattern = new RegExp(`^\\s*${prefix}([a-z0-9-]+)\\s*:`, "gim");
  return [...css.matchAll(pattern)].map((match) => match[1]!);
}

/**
 * Read the vocabulary out of the Theme Layer's generated artifacts. Adding a
 * semantic colour token upstream widens what the Kit may use, on the next
 * build and with no edit here.
 */
export function readVocabulary(
  themeCss: string = readArtifact("@reddb-io/theme/theme.css"),
  baseCss: string = readArtifact("@reddb-io/theme/base.css")
): Vocabulary {
  const utilityColours = new Set(declaredNames(themeCss, "--color-"));
  const themed = declaredNames(baseCss, "--reddb-color-");
  return {
    colours: themed.filter((name) => utilityColours.has(name)).sort(),
    radii: declaredNames(themeCss, "--radius-").sort(),
  };
}
