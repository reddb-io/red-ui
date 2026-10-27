/** A CSS custom property supplied by the DS or the host application. */
export type ColorToken = `--${string}`;
/** Stable entity ids mapped to color tokens; sorting never reassigns these colors. */
export type ChartPalette = Readonly<Record<string, ColorToken>>;
/** Resolve a token declaratively, retaining the scheme-aware DS fallback. */
export function tokenColor(token: ColorToken | undefined, fallback: string): string {
  if (token === undefined) return fallback;
  if (!/^--[a-zA-Z_][a-zA-Z0-9_-]*$/.test(token)) throw new Error("Color must name a CSS custom property");
  return `var(${token}, ${fallback})`;
}
