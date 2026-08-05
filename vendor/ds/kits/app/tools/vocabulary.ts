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
//
// Spatial is read from a third artifact, and asks a third question:
//
//   density-comfortable.css (the neutral stop) — which spatial roles exist,
//              and which step of the Brand's spacing scale each anchors at.
//
// A role is a name a density stop reassigns (ADR 0003), so naming one is what
// makes a spatial value follow the axis. Knowing where it anchors is what makes
// the rule decidable in the other direction: `h-9` compiles to 2.25rem, which
// is what `control-height-md` renders at under the neutral stop, so that
// position has a role to route through and writing the step instead freezes it.
// The neutral is the stop to read because it is the one the Kit already ships
// in — every other stop is a shift away from these same lengths.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

/** The styling names the Layers make available to a Kit. */
export interface Vocabulary {
  /** Colour utility names, e.g. "primary" — Theme-declared and utility-backed. */
  colours: readonly string[];
  /** Radius utility names, e.g. "md". */
  radii: readonly string[];
  /**
   * Density roles, each mapped to the length the neutral stop renders it at:
   * `control-height-md` -> `2.25rem`. Names are given without their
   * `--reddb-spatial-` prefix, as the colours and radii are.
   */
  spatial: Readonly<Record<string, string>>;
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

/** Every `--reddb-*: value` declaration in `css`, as name -> value. */
function declarations(css: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const match of css.matchAll(/(--reddb-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    declared.set(match[1]!, match[2]!.trim());
  }
  return declared;
}

const SPATIAL_PREFIX = "--reddb-spatial-";
const REFERENCE_RE = /^var\(\s*(--reddb-[a-z0-9-]+)\s*\)$/;

/**
 * Follow each spatial role of a stop through to the length it renders at: a
 * stop declares nothing but references to the Brand's spacing scale, so the
 * length is the scale's, read back rather than restated.
 *
 * A reference to a step nothing declares is a broken pair of artifacts, and
 * the lint stops instead of quietly forgetting a role — a forgotten role reads
 * as "no rule here", which is the one failure a lint must not have.
 */
function readSpatial(
  stopCss: string,
  brandCss: string
): Record<string, string> {
  const brand = declarations(brandCss);
  const spatial: Record<string, string> = {};
  for (const [name, value] of declarations(stopCss)) {
    if (!name.startsWith(SPATIAL_PREFIX)) continue;
    const reference = REFERENCE_RE.exec(value);
    const length = reference === null ? value : brand.get(reference[1]!);
    if (length === undefined) {
      throw new Error(
        `The Density stop declares ${name} as ${value}, and nothing declares ${reference![1]}; ` +
          "rebuild @reddb-io/tokens so the stops and the Brand's scale come from one source."
      );
    }
    spatial[name.slice(SPATIAL_PREFIX.length)] = length;
  }
  return spatial;
}

/**
 * Read the vocabulary out of the Layers' generated artifacts. Adding a semantic
 * colour token or a spatial role upstream widens what the Kit may use, on the
 * next build and with no edit here.
 */
export function readVocabulary(
  themeCss: string = readArtifact("@reddb-io/theme/theme.css"),
  baseCss: string = readArtifact("@reddb-io/theme/base.css"),
  neutralCss: string = readArtifact("@reddb-io/tokens/density-comfortable.css"),
  brandCss: string = readArtifact("@reddb-io/tokens/tokens.css")
): Vocabulary {
  const utilityColours = new Set(declaredNames(themeCss, "--color-"));
  const themed = declaredNames(baseCss, "--reddb-color-");
  return {
    colours: themed.filter((name) => utilityColours.has(name)).sort(),
    radii: declaredNames(themeCss, "--radius-").sort(),
    spatial: readSpatial(neutralCss, brandCss),
  };
}
