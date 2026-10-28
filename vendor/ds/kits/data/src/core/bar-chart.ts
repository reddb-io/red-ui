import { unique, finite } from "../visualization";
import type { CompositeValueSeries } from "./composite-chart";
import { automaticChartPalette, chartColorToken, type ChartPalette, type ColorToken } from "./chart-color";
/** One stable comparison category. */
export interface BarCategory {
  /** Unique category identity. */
  id: string;
  /** Full category label. */
  label: string;
  /** Single observation; use values for grouped or stacked observations. */
  value?: number | null;
  /** Observations keyed by declared series id; missing entries remain gaps. */
  values?: Readonly<Record<string, number | null>>;
  /** Color token for a single-series category. */
  color?: ColorToken;
}
/** A named contribution present across comparison categories. */
export interface BarSeries {
  /** Stable identity matching each category's values. */
  id: string;
  /** Legend name. */
  label: string;
  /** Optional categorical role. */
  series?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Optional color token. */
  color?: ColorToken;
}
export function barModel(data: readonly BarCategory[], series: readonly BarSeries[] = [], sort: "input" | "ascending" | "descending" = "input", palette?: ChartPalette) {
  unique(data, "BarChart categories"); unique(series, "BarChart series");
  for (const item of data) for (const value of item.values ? Object.values(item.values) : [item.value]) if (value !== null && value !== undefined) finite(value, item.id);
  const total = (item: BarCategory) => series.length ? series.reduce((sum, s) => sum + (item.values?.[s.id] ?? 0), 0) : item.value ?? 0;
  const categories = [...data];
  if (sort !== "input") categories.sort((a, b) => (total(a) - total(b)) * (sort === "ascending" ? 1 : -1));
  const automatic = automaticChartPalette(series.length ? series : data);
  const layers: CompositeValueSeries[] = (series.length ? series : [{ id: "value", label: "Value" }]).map(s => ({ ...s, color: series.length ? chartColorToken(s, palette, automatic) : undefined, kind: "column", data: categories.map(item => ({ x: item.id, y: series.length ? item.values?.[s.id] ?? null : item.value ?? null, color: series.length ? undefined : chartColorToken(item, palette, automatic) })) }));
  const labels = new Map(data.map(item => [item.id, item.label]));
  return { categories, layers, formatX: (value: string | number | Date) => labels.get(String(value)) ?? String(value) };
}
