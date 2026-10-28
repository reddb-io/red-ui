import { tokenColor, type ColorToken, type ChartPalette } from "@reddb-io/design-system/base/recipes";
export type { ColorToken, ChartPalette };
/** Ten categorical positions for up to ten competing entities. Scheme-aware tokens. */
export const CHART_PALETTE_10: readonly ColorToken[] = Object.freeze(Array.from({ length: 10 }, (_, i) => `--reddb-color-chart-${i + 1}` as ColorToken));
/** Forty categorical positions; the first ten match the smaller package. */
export const CHART_PALETTE_40: readonly ColorToken[] = Object.freeze(Array.from({ length: 40 }, (_, i) => `--reddb-color-chart-${i + 1}` as ColorToken));
/** Select by competing identities, never by the number of samples in a series. */
export function chartPaletteFor(count: number): readonly ColorToken[] {
  if (!Number.isInteger(count) || count < 0) throw new Error("Chart palette count must be a nonnegative integer");
  return count <= 10 ? CHART_PALETTE_10 : CHART_PALETTE_40;
}
type ColorItem = { id?: string; color?: ColorToken; series?: number };
/** Collision-free through forty entities. Sorting the same identity set never reassigns a color.
 * Different identity sets may remap: pass a shared palette for cross-chart/live identity persistence.
 * Above forty positions repeat; labels/selection remain necessary.
 */
export function automaticChartPalette(items: readonly { id: string }[]): ChartPalette {
  const compare = new Intl.Collator("en", { numeric: true }).compare;
  const ids = [...new Set(items.map(item => item.id))].sort((a, b) => compare(a, b) || (a < b ? -1 : a > b ? 1 : 0));
  const colors = chartPaletteFor(ids.length);
  return Object.fromEntries(ids.map((id, index) => [id, colors[index % colors.length]!]));
}
/** Explicit token, application palette, explicit legacy role, then automatic token. */
export function chartColorToken(item: ColorItem, palette?: ChartPalette, automatic?: ChartPalette): ColorToken | undefined {
  return item.color ?? (item.id ? palette?.[item.id] : undefined) ?? (item.series !== undefined ? undefined : item.id ? automatic?.[item.id] : undefined);
}
/** Resolve once for plot, legend and readout in both native implementations. */
export function chartColor(item: ColorItem, palette?: ChartPalette, automatic?: ChartPalette): string {
  return tokenColor(chartColorToken(item, palette, automatic), `var(--reddb-color-series-${item.series ?? 1})`);
}
/** Supply token colors to models whose renderers already consume seriesColor. */
export function automaticChartColors<T extends { id: string; color?: ColorToken; series?: number }>(items: readonly T[]): T[] {
  const automatic = automaticChartPalette(items);
  return items.map(item => ({ ...item, color: chartColorToken(item, undefined, automatic) }));
}
