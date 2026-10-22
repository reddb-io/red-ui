export const colors = {
  bg: {
    0: "var(--reddb-color-background)",
    1: "var(--reddb-color-elevation-base-surface)",
    2: "var(--reddb-color-muted)",
    3: "var(--reddb-color-elevation-raised-surface)",
  },
  fg: {
    0: "var(--reddb-color-foreground)",
    1: "var(--reddb-color-foreground)",
    2: "var(--reddb-color-ink-muted)",
    3: "var(--reddb-color-ink-muted)",
  },
  line: {
    1: "var(--reddb-color-border-subtle)",
    2: "var(--reddb-color-control-edge)",
    3: "var(--reddb-color-border-strong)",
  },
  accent: "var(--reddb-color-primary)",
  ok: "var(--reddb-color-feedback-success-foreground)",
  warn: "var(--reddb-color-feedback-warning-foreground)",
  danger: "var(--reddb-color-feedback-danger-foreground)",
  info: "var(--reddb-color-feedback-info-foreground)",
  role: {
    primary: "var(--reddb-color-primary)",
    replica: "var(--reddb-color-feedback-info-foreground)",
    embedded: "var(--reddb-color-feedback-success-foreground)",
  },
} as const;

export const radius = {
  sm: "var(--reddb-radius-sm)",
  md: "var(--reddb-radius-md)",
  lg: "var(--reddb-radius-lg)",
  xl: "var(--reddb-radius-xl)",
} as const;
export const font = {
  sans: "var(--reddb-font-family-sans)",
  mono: "var(--reddb-font-family-mono)",
} as const;
export const ease = {
  out: "var(--reddb-easing-entrance)",
  snap: "var(--reddb-easing-entrance)",
} as const;
