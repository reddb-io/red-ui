// Skin-as-data theming (#75).
//
// A skin is *plain data*: a name, human labels, a handful of colour seeds
// (dark), and a type pairing. Adding a skin is a single entry in `SKINS` —
// no render code changes. The pure `skinToCssVars` mapping turns those seeds
// into the full `--color-*` custom-property set the app already consumes,
// deriving the `--color-bg-0..bg-3` surface ramp (and the `fg`/`line` ramps)
// via CSS `color-mix` so the steps stay perceptually monotonic without
// hand-tuning every level. The DOM application + persistence below is a thin
// shell over that pure core.
//
// Dark-only by design: every seed is a dark surface, and there is no
// `light` / `system` branch. The default skin keeps reddb's signature
// `#ff2056` accent.

export interface SkinSeeds {
  /** Darkest surface — becomes `--color-bg-0`; every other surface ramps up from it. */
  bg: string;
  /** Surgical accent — `--color-accent` and the primary node role. */
  accent: string;
  /** Primary text (`--color-fg-0`); the fg ramp darkens toward `bg`. */
  fg: string;
}

export interface SkinTypography {
  /** `--font-sans` stack. */
  sans: string;
  /** `--font-mono` stack. */
  mono: string;
}

export interface Skin {
  /** Stable id, persisted in localStorage and used for selection. */
  name: string;
  /** Human label shown on the preview card. */
  label: string;
  /** One-line description of the mood. */
  description: string;
  /** Dark colour seeds. */
  colors: SkinSeeds;
  /** Type pairing. */
  typography: SkinTypography;
}

const FONT_SANS =
  "'Inter Variable', 'Inter', system-ui, -apple-system, sans-serif";
const FONT_MONO =
  "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, 'SF Mono', 'Menlo', monospace";

/**
 * The registry. Two curated dark skins — the mechanism, not a buffet.
 * The first entry is the default.
 */
export const SKINS: readonly Skin[] = [
  {
    name: "reddb",
    label: "Reddb",
    description: "The signature near-black with a surgical rose accent.",
    colors: { bg: "#050607", accent: "#ff2056", fg: "#f7f8fa" },
    typography: { sans: FONT_SANS, mono: FONT_MONO },
  },
  {
    name: "nocturne",
    label: "Nocturne",
    description: "Indigo-tinted midnight with a violet accent.",
    colors: { bg: "#0a0b14", accent: "#7c5cff", fg: "#f5f6fb" },
    typography: { sans: FONT_SANS, mono: FONT_MONO },
  },
] as const;

export const DEFAULT_SKIN = SKINS[0];

export const STORAGE_KEY = "red-ui-skin";

/** Look a skin up by name, falling back to the default. */
export function skinByName(name: string | null | undefined): Skin {
  return SKINS.find((s) => s.name === name) ?? DEFAULT_SKIN;
}

// ─── pure mapping (the unit-testable core) ──────────────────────────────────

/**
 * `color-mix(in srgb, <lift> P%, <base>)`. In the sRGB space this is a linear
 * interpolation, so a strictly increasing `pct` of a lighter `lift` yields a
 * strictly lighter result — which is what keeps the surface ramp monotonic.
 */
function mix(lift: string, pct: number, base: string): string {
  return `color-mix(in srgb, ${lift} ${pct}%, ${base})`;
}

/** `color-mix(in srgb, <color> P%, transparent)` — a translucent wash of `color`. */
function alpha(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/**
 * Surface ramp `bg-0..bg-3`, lightened from the `bg` seed by an increasing
 * fraction of white. `bg-0` is the pure seed (0% lift); the lift percentages
 * are strictly increasing, so the ramp is monotonic by construction.
 */
const SURFACE_LIFT = [0, 4, 9, 15] as const;
/** Hairline ramp `line-1..3`, also lightened from `bg` with white. */
const LINE_LIFT = [6, 13, 22] as const;
/**
 * Text ramp `fg-0..fg-3`, faded from the `fg` seed toward `bg` by a
 * decreasing fraction of `fg`. `fg-0` is the pure seed (100%); the
 * percentages decrease, so readability steps down monotonically.
 */
const TEXT_MIX = [100, 78, 58, 45] as const;

/**
 * Pure seed → CSS-var mapping. Returns the complete custom-property set the
 * app's tokens expect, with the `bg`/`fg`/`line` ramps derived via `color-mix`
 * and the accent washes derived from the accent seed. No DOM, no I/O — this is
 * what the unit tests exercise.
 */
export function skinToCssVars(skin: Skin): Record<string, string> {
  const { bg, accent, fg } = skin.colors;
  const white = "#ffffff";

  const vars: Record<string, string> = {
    // Surfaces — monotonic ramp from the bg seed.
    "--color-bg-0":
      SURFACE_LIFT[0] === 0 ? bg : mix(white, SURFACE_LIFT[0], bg),
    "--color-bg-1": mix(white, SURFACE_LIFT[1], bg),
    "--color-bg-2": mix(white, SURFACE_LIFT[2], bg),
    "--color-bg-3": mix(white, SURFACE_LIFT[3], bg),

    // Text — monotonic ramp fading toward the bg seed.
    "--color-fg-0": fg,
    "--color-fg-1": mix(fg, TEXT_MIX[1], bg),
    "--color-fg-2": mix(fg, TEXT_MIX[2], bg),
    "--color-fg-3": mix(fg, TEXT_MIX[3], bg),

    // Hairlines.
    "--color-line-1": mix(white, LINE_LIFT[0], bg),
    "--color-line-2": mix(white, LINE_LIFT[1], bg),
    "--color-line-3": mix(white, LINE_LIFT[2], bg),

    // Surgical accent + washes derived from the accent seed.
    "--color-accent": accent,
    "--color-accent-soft": alpha(accent, 12),
    "--color-accent-glow": alpha(accent, 45),
    "--color-ambient-glow": alpha(accent, 6),

    // Node roles — primary tracks the accent; replica/embedded stay legible
    // semantic hues that read on any dark surface.
    "--color-role-primary": accent,
    "--color-role-replica": "#60a5fa",
    "--color-role-embedded": "#4ade80",

    // Semantic — dark-tuned, shared across skins.
    "--color-ok": "#4ade80",
    "--color-warn": "#fbbf24",
    "--color-danger": "#ff5470",
    "--color-info": "#60a5fa",

    // Typography.
    "--font-sans": skin.typography.sans,
    "--font-mono": skin.typography.mono,
  };

  return vars;
}

/**
 * Apply a skin's derived custom properties to a DOM element as inline styles.
 * Inline styles win over the stylesheet's `:root` rules, so this overrides the
 * active theme tokens regardless of `data-theme`. The thin shell
 * (`skins.svelte.ts`) wires this to mount + persistence.
 */
export function applySkin(skin: Skin, target: HTMLElement) {
  const vars = skinToCssVars(skin);
  for (const [k, v] of Object.entries(vars)) target.style.setProperty(k, v);
  // Skins are dark-only; pin data-theme so the shadcn semantic aliases that
  // key off it stay consistent with the inline surface ramp.
  target.dataset.theme = "dark";
}
