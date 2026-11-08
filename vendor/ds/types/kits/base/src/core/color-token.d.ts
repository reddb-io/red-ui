/** A CSS custom property supplied by the DS or the host application. */
export type ColorToken = `--${string}`;
/** Stable entity ids mapped to color tokens; sorting never reassigns these colors. */
export type ChartPalette = Readonly<Record<string, ColorToken>>;
/** Resolve a token declaratively, retaining the scheme-aware DS fallback. */
export declare function tokenColor(token: ColorToken | undefined, fallback: string): string;
