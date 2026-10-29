// Compatibility for persisted skin preferences. Appearance is owned by DS Theme
// and Color Scheme; legacy seed palettes no longer override canonical roles.
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


export const STORAGE_KEY = 'red-ui-skin';
export const DEFAULT_SKIN: Skin = {
  name: 'reddb', label: 'Reddb', description: 'Design System application appearance.',
  colors: { bg: 'var(--reddb-color-background)', accent: 'var(--reddb-color-primary)', fg: 'var(--reddb-color-foreground)' },
  typography: { sans: 'var(--reddb-font-family-sans)', mono: 'var(--reddb-font-family-mono)' },
};
export const SKINS: readonly Skin[] = [DEFAULT_SKIN];
export function skinByName(_name: string | null | undefined): Skin { return DEFAULT_SKIN; }

const roles: Record<string, string> = {
  'bg-0': 'background', 'bg-1': 'elevation-base-surface', 'bg-2': 'muted', 'bg-3': 'elevation-raised-surface',
  'fg-0': 'foreground', 'fg-1': 'foreground', 'fg-2': 'ink-muted', 'fg-3': 'ink-muted',
  'line-1': 'border-subtle', 'line-2': 'control-edge', 'line-3': 'border-strong',
  accent: 'primary', 'role-primary': 'primary-text', 'role-replica': 'feedback-info-foreground',
  'role-embedded': 'feedback-success-foreground', ok: 'feedback-success-foreground',
  warn: 'feedback-warning-foreground', danger: 'feedback-danger-foreground', info: 'feedback-info-foreground',
};
/** @deprecated Read canonical DS roles directly in new consumers. */
export function skinToCssVars(_skin: Skin): Record<string, string> {
  return { ...Object.fromEntries(Object.entries(roles).map(([alias,role]) => [`--color-${alias}`, `var(--reddb-color-${role})`])),
    '--font-sans': DEFAULT_SKIN.typography.sans, '--font-mono': DEFAULT_SKIN.typography.mono };
}
/** Remove only the properties owned by the retired skin mechanism. */
export function applySkin(_skin: Skin, target: HTMLElement) {
  for (const key of [...Object.keys(skinToCssVars(DEFAULT_SKIN)), '--color-accent-soft', '--color-accent-glow', '--color-ambient-glow']) target.style.removeProperty(key);
  for (const role of ['background', 'elevation-base-surface', 'muted', 'elevation-raised-surface', 'foreground', 'ink-muted', 'border-subtle', 'control-edge', 'border-strong', 'primary', 'primary-text']) target.style.removeProperty(`--reddb-color-${role}`);
  target.dataset.theme = 'application';
}
