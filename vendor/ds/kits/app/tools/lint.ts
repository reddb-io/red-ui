// Anti-hardcode lint for the Kit.
//
// The Theme Layer's own lint (packages/theme/src/lint.ts) asks one question of
// a CSS artifact: does every value reference a `--reddb-*` token? A Kit is not
// CSS — its styling is a vocabulary of Tailwind 4 utility class names — so the
// same invariant has to be asked in the Kit's own terms:
//
//   1. no raw Brand value anywhere in the Kit's source (a hex colour, an
//      rgb()/hsl()/oklch() literal);
//   2. no <style> block in a component — scoped CSS is a second styling source
//      the Themes cannot reach, and shadcn-svelte style has exactly one;
//   3. every colour and radius utility the Kit wears names a token the Layers
//      generated (see vocabulary.ts), never a Tailwind default and never an
//      arbitrary `[...]` value that is not a `var(--reddb-*)` reference;
//   4. every spatial utility the Density axis ships a role for names that role
//      rather than a fixed step — `h-9` compiles to 2.25rem, which is what
//      `control-height-md` renders at, so a Kit written in steps is frozen
//      against a density stop exactly as a Kit written in hex is frozen
//      against a Theme (ADR 0003, issue #33's migration, this rule's contract).
//
// Together those are the mechanical form of "this component re-themes and
// re-densifies": there is no path by which a Brand value reaches the rendered
// component except through a token the active Theme, or the declared density
// stop, reassigns.
//
// What the lint reads, and what it therefore cannot see: class strings live in
// `*.variants.ts` (by the Kit's own convention, one `tv()` call per component)
// and in literal `class="…"` attributes. A class name computed at runtime from
// a non-literal expression is outside its reach — which is a cost the Kit pays
// deliberately, because the alternative is compiling Svelte to find out.

import { readFileSync } from "node:fs";
import type { Vocabulary } from "./vocabulary";

export interface KitViolation {
  /** File the violation was found in (as passed to the linter). */
  file: string;
  /** 1-based line number. */
  line: number;
  /** What was found — a class name, a literal, or "<style>". */
  found: string;
  /** Human-readable explanation. */
  reason: string;
}

// A colour written as a value rather than named as a token. `#abc`, `#aabbcc`,
// `rgb(...)`, `hsl(...)`, `oklch(...)`, `color(...)` — the forms a Brand colour
// could be smuggled in as.
const RAW_COLOUR_RE =
  /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const STYLE_BLOCK_RE = /<style\b/gi;

// Prefixes that are always a colour position: whatever follows names a colour.
const COLOUR_PREFIXES = [
  "bg",
  "accent",
  "caret",
  "fill",
  "stroke",
  "placeholder",
  "from",
  "via",
  "to",
] as const;

// Prefixes that are a colour position only sometimes — `border-2` is a width,
// `text-sm` is a size, `ring-2` is a width. The suffix decides.
const MAYBE_COLOUR_PREFIXES = [
  "text",
  "border",
  "ring",
  "outline",
  "divide",
  "decoration",
  "shadow",
] as const;

// Radius positions: `rounded`, plus every side and corner form.
const RADIUS_PREFIXES = [
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-s",
  "rounded-e",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
  "rounded-ss",
  "rounded-se",
  "rounded-ee",
  "rounded-es",
] as const;

// Spatial positions, grouped by the family of Density roles that owns them.
// The axis ships three roles each of control height, inset and gap (ADR 0003),
// and the grouping is what keeps them apart: 0.25rem is what `gap-sm` renders
// at, so `gap-1` is frozen — while `pt-1` is the same length in a position the
// axis ships no inset for, and is left alone.
//
// What is absent is as deliberate as what is present. `size-*` and `w-*` are
// not here: an icon scale is not a control height (density shrinks components,
// not legibility) and the Brand ships no width family at all, which is why a
// SplitView's divider stays on a Tailwind step. Margins are not here either —
// an inset is the space a component holds inside itself, and the space between
// components is the caller's layout, not the Kit's.
const SPATIAL_FAMILIES = [
  { family: "control-height", prefixes: ["h", "min-h", "max-h"] },
  {
    family: "inset",
    prefixes: ["p", "px", "py", "pt", "pr", "pb", "pl", "ps", "pe"],
  },
  { family: "gap", prefixes: ["gap", "gap-x", "gap-y"] },
] as const;

// Tailwind's own spacing scale: a step is a multiple of 0.25rem. That constant
// is Tailwind's, not the Brand's — and it is the whole problem, because it is
// applied at build time and leaves nothing behind for a stop to reassign.
const TAILWIND_STEP_REM = 0.25;
const TAILWIND_STEP_RE = /^\d+(?:\.\d+)?$/;
const REM_RE = /^(\d+(?:\.\d+)?)rem$/;

// The only arbitrary value a spatial position may hold: a reference to a role
// the axis reassigns. A `--reddb-space-*` step is a real token and still wrong
// here — a stop moves the roles, never the scale the roles land on.
const SPATIAL_VAR_RE = /^\[var\(--reddb-spatial-([a-z0-9-]+)\)\]$/i;

// Cascade keywords, legal in any position: they carry no Brand value, so no
// Theme has anything to reassign about them.
const KEYWORDS = new Set([
  "transparent",
  "current",
  "inherit",
  "initial",
  "unset",
  "none",
  "auto",
]);

// Suffixes that put an ambiguous prefix in a NON-colour position: a number
// (`border-2`), a length (`text-xs`), a side (`border-b`), a line style
// (`border-dashed`), an alignment (`text-center`). Anything else after an
// ambiguous prefix is read as a colour and must be in the vocabulary — which
// is what makes `text-black` and `border-white` violations rather than
// oversights.
const NON_COLOUR_SUFFIX_RE = new RegExp(
  [
    "^\\d+(\\.\\d+)?(px|rem|em|%)?$", // border-2, ring-1, decoration-2
    "^(t|r|b|l|x|y|s|e|tl|tr|br|bl|ss|se|ee|es)$", // border-b, divide-x
    "^(xs|sm|base|md|lg|\\d*xl)$", // text-sm, shadow-lg
    "^(left|right|center|justify|start|end)$", // text-center
    "^(wrap|nowrap|balance|pretty|clip|ellipsis)$", // text-balance
    "^(solid|dashed|dotted|double|hidden|wavy)$", // border-dashed
    "^(offset|reverse|thickness|hidden|inset)$", // ring-offset, divide-reverse
    "^(ellipsis|clip|opacity)$",
  ].join("|")
);

/** A Tailwind class as written, minus its variant modifiers and opacity. */
interface ParsedClass {
  /** `hover:bg-primary/80` -> `bg-primary`. */
  utility: string;
  /** The class exactly as it appeared, for reporting. */
  raw: string;
}

/**
 * Strip `hover:`, `focus-visible:`, `md:` … and a trailing `/50` opacity, so
 * the utility can be checked once regardless of when it applies. Modifiers are
 * conditions, not values; the opacity modifier is a percentage of a token, not
 * a colour of its own.
 */
export function parseClass(raw: string): ParsedClass {
  // Modifiers are colon-separated and cannot appear inside an arbitrary value,
  // so the last colon outside brackets ends the modifier list.
  let depth = 0;
  let lastColon = -1;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i]!;
    if (char === "[") depth += 1;
    else if (char === "]") depth -= 1;
    else if (char === ":" && depth === 0) lastColon = i;
  }
  let utility = raw.slice(lastColon + 1);
  // A negative utility (`-mt-2`) is the same position as its positive form.
  if (utility.startsWith("-")) utility = utility.slice(1);
  const slash = utility.lastIndexOf("/");
  if (slash > 0 && !utility.slice(slash).includes("]"))
    utility = utility.slice(0, slash);
  return { utility, raw };
}

function splitPrefix(
  utility: string,
  prefixes: readonly string[]
): string | null {
  // Longest prefix first, so `rounded-tl-md` is a corner radius and not
  // `rounded` with the suffix `tl-md`.
  const matches = prefixes
    .filter((prefix) => utility.startsWith(`${prefix}-`))
    .sort((a, b) => b.length - a.length);
  const prefix = matches[0];
  return prefix === undefined ? null : utility.slice(prefix.length + 1);
}

/** Is `value` an arbitrary Tailwind value, `[...]`? */
function isArbitrary(value: string): boolean {
  return value.startsWith("[") && value.endsWith("]");
}

// The only arbitrary value a Kit may use: a direct reference to a token, which
// is the same escape hatch the Theme Layer's own lint allows and rejects a
// fallback for, for the same reason.
const REDDB_VAR_RE = /^\[var\(--reddb-[a-z0-9-]+\)\]$/i;

/** The length `value` denotes, in rem, or `null` when it denotes none. */
function rem(value: string): number | null {
  const match = REM_RE.exec(value);
  return match === null ? null : Number(match[1]);
}

/** The role of `family` the neutral stop renders at `length`, if the axis ships one. */
function roleAt(
  spatial: Vocabulary["spatial"],
  family: string,
  length: number
): string | null {
  for (const [role, anchor] of Object.entries(spatial)) {
    if (!role.startsWith(`${family}-`)) continue;
    const anchored = rem(anchor);
    // Both sides are rem because the Brand's spacing scale is: a role anchored
    // in another unit is one this cannot compare, and silence beats a guess.
    if (anchored !== null && Math.abs(anchored - length) < 1e-9) return role;
  }
  return null;
}

/**
 * Check one class against the Density axis. A spatial position the axis ships
 * a role for must name that role; a position it ships none for is left alone,
 * because routing a value the axis has no role at would either move what the
 * neutral stop renders or invent a role the Tokens Layer does not ship.
 */
function checkSpatial(utility: string, vocabulary: Vocabulary): string | null {
  const roles = Object.keys(vocabulary.spatial).sort().join(", ");
  for (const { family, prefixes } of SPATIAL_FAMILIES) {
    const value = splitPrefix(utility, prefixes);
    if (value === null) continue;

    if (isArbitrary(value)) {
      const named = SPATIAL_VAR_RE.exec(value);
      if (named === null) {
        return (
          "spatial value written as a value — a density stop reassigns the axis's roles, " +
          `so nothing else here moves with one; name a role instead (${roles})`
        );
      }
      const role = named[1]!.toLowerCase();
      return role in vocabulary.spatial
        ? null
        : `unknown spatial role "${role}" — it resolves to nothing and the declaration is dropped; the Density axis ships ${roles}`;
    }

    if (!TAILWIND_STEP_RE.test(value)) return null;
    const role = roleAt(
      vocabulary.spatial,
      family,
      Number(value) * TAILWIND_STEP_REM
    );
    return role === null
      ? null
      : `fixed spatial step — it compiles to the length "${role}" renders at, and a stop cannot reach it; write [var(--reddb-spatial-${role})]`;
  }
  return null;
}

/**
 * Check one class name against the vocabulary. Returns the reason it is not
 * allowed, or `null` when it is fine (including when it is not a colour,
 * radius or spatial utility at all, which is most classes).
 */
export function checkClass(raw: string, vocabulary: Vocabulary): string | null {
  const { utility } = parseClass(raw);

  const spatial = checkSpatial(utility, vocabulary);
  if (spatial !== null) return spatial;

  const radius = splitPrefix(utility, RADIUS_PREFIXES);
  if (radius !== null) {
    if (isArbitrary(radius)) {
      return REDDB_VAR_RE.test(radius)
        ? null
        : `arbitrary radius value — use a rounded-* utility the Theme Layer generated (${vocabulary.radii.join(", ")})`;
    }
    if (KEYWORDS.has(radius) || vocabulary.radii.includes(radius)) return null;
    return `unknown radius "${radius}" — the Theme Layer generates ${vocabulary.radii.join(", ")}`;
  }

  const always = splitPrefix(utility, COLOUR_PREFIXES);
  const maybe =
    always === null ? splitPrefix(utility, MAYBE_COLOUR_PREFIXES) : null;
  const colour = always ?? maybe;
  if (colour === null) return null;
  // For an ambiguous prefix, a non-colour suffix means this is a width, a size
  // or a side — a dimension the Brand ships no token family for yet, and one
  // the lint therefore has nothing to check it against.
  if (maybe !== null && NON_COLOUR_SUFFIX_RE.test(maybe)) return null;

  if (isArbitrary(colour)) {
    return REDDB_VAR_RE.test(colour)
      ? null
      : "arbitrary colour value — a Theme cannot reassign it; name a token instead";
  }
  if (KEYWORDS.has(colour) || vocabulary.colours.includes(colour)) return null;
  return `colour "${colour}" is not a Theme-declared token — the Themes reassign ${vocabulary.colours.join(", ")}, so anything else is frozen against a Theme switch`;
}

/** 1-based line number of `index` within `source`. */
function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

// Class-bearing text: every string literal in a variants module (those files
// hold nothing but class vocabularies), and every literal class attribute in a
// component.
const STRING_LITERAL_RE = /"([^"\\\n]*)"|'([^'\\\n]*)'|`([^`\\$]*)`/g;
const CLASS_ATTRIBUTE_RE = /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

function classSources(
  source: string,
  file: string
): { text: string; index: number }[] {
  const pattern = file.endsWith(".variants.ts")
    ? STRING_LITERAL_RE
    : CLASS_ATTRIBUTE_RE;
  const found: { text: string; index: number }[] = [];
  for (const match of source.matchAll(pattern)) {
    const text = match[1] ?? match[2] ?? match[3];
    if (text === undefined) continue;
    found.push({ text, index: match.index });
  }
  return found;
}

/** Lint one Kit source file. `file` is used for reporting and to pick a mode. */
export function lintKitSource(
  source: string,
  file: string,
  vocabulary: Vocabulary
): KitViolation[] {
  const violations: KitViolation[] = [];

  for (const match of source.matchAll(RAW_COLOUR_RE)) {
    violations.push({
      file,
      line: lineAt(source, match.index),
      found: match[0],
      reason:
        "raw colour value — a Kit names colours through Theme Layer utilities, never through a value",
    });
  }

  if (file.endsWith(".svelte")) {
    for (const match of source.matchAll(STYLE_BLOCK_RE)) {
      violations.push({
        file,
        line: lineAt(source, match.index),
        found: "<style>",
        reason:
          "scoped <style> block — styling belongs in the component's tv() variants, which the Themes can reach",
      });
    }
  }

  for (const { text, index } of classSources(source, file)) {
    for (const raw of text.split(/\s+/)) {
      if (raw === "") continue;
      const reason = checkClass(raw, vocabulary);
      if (reason === null) continue;
      violations.push({
        file,
        line: lineAt(source, index),
        found: raw,
        reason,
      });
    }
  }

  return violations;
}

/** Lint each file path, aggregating violations across all of them. */
export function lintKitFiles(
  paths: readonly string[],
  vocabulary: Vocabulary
): KitViolation[] {
  return paths.flatMap((path) =>
    lintKitSource(readFileSync(path, "utf8"), path, vocabulary)
  );
}
