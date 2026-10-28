import { automaticChartPalette, chartColor, type ColorToken, type ChartPalette } from "./chart-color";
import type { ChartTimeRange } from "../chart";
import { chartTimeRange } from "./chart-time";
import { axisLabelWidth, formatChartNumber, type ChartNumberFormat, type ChartSeries } from "../chart";

/** A shared observation coordinate. String categories cannot be mixed with numbers or Dates. */
export type CompositeX = number | Date | string;
/** One value; null is an explicit gap and is never interpolated over. */
export interface CompositePoint {
  /** Shared time, numeric coordinate or category. */
  x: CompositeX;
  /** Observed value, or null when unavailable. */
  y: number | null;
  /** Optional observation color token, useful for category rankings. */
  color?: ColorToken;
}
/** An OHLC observation; invalid bounds are omitted rather than repaired. */
export interface CandlePoint {
  /** Shared time, numeric coordinate or category. */
  x: CompositeX;
  /** Opening value, inside low and high. */
  open: number;
  /** Highest value, at least open and close. */
  high: number;
  /** Lowest value, at most open and close. */
  low: number;
  /** Closing value, inside low and high. */
  close: number;
}
interface CompositeSeriesIdentity {
  /** Explicit color token, overriding the id palette and series role. */
  color?: ColorToken;
  /** Unique stable identity used by legend state. */
  id: string;
  /** Visible series name. */
  label: string;
  /** Primary scale by default; secondary requires a named secondaryAxis. */
  axis?: "primary" | "secondary";
  /** DS categorical Series Role, assigned cyclically when omitted. */
  series?: ChartSeries;
  /** Ascending drawing order; array order breaks ties. */
  order?: number;
}
/** A line, area or column layer. Columns become horizontal bars when orientation is horizontal. */
export interface CompositeValueSeries extends CompositeSeriesIdentity {
  /** Geometry of this layer, independent of every other series. */
  kind: "line" | "area" | "column";
  /** Caller-owned observations; last duplicate coordinate wins. */
  data: readonly CompositePoint[];
  /** Straight segments by default; dash distinguishes trend or target lines. */
  dash?: "solid" | "dashed" | "dotted";
}
/** A candle layer; hollow rising, filled falling and a cross for unchanged values. */
export interface CompositeCandleSeries extends CompositeSeriesIdentity {
  /** Candle geometry with OHLC bounds. */
  kind: "candlestick";
  /** Caller-owned OHLC observations; last duplicate coordinate wins. */
  data: readonly CandlePoint[];
}
/** One layer in a composed chart. */
export type CompositeChartSeries = CompositeValueSeries | CompositeCandleSeries;
/** A value scale; primary and secondary units are independent. */
export interface CompositeAxis {
  /** Visible unit/scale name, paired with its side in the legend bar. */
  label: string;
  /** Formatter shared by ticks and inspection. */
  format?: ChartNumberFormat;
  /** Exact finite increasing bounds. Omitted, inferred from all layers on this scale. */
  domain?: readonly [number, number];
}
interface ReferenceIdentity {
  /** Unique reference identity. */
  id: string;
  /** Visible text in the reference's accessible description and native tooltip. */
  label: string;
  /** DS Series Role; defaults to six. */
  series?: ChartSeries;
}
/** A reference level or observation marker. Its direction follows the chosen orientation. */
export type CompositeReference = ReferenceIdentity & (
  | { /** Value-scale reference. */ kind: "value"; /** Level on the selected value scale. */ value: number; /** Primary scale unless specified. */ axis?: "primary" | "secondary" }
  | { /** Shared sample-axis reference. */ kind: "sample"; /** Observation coordinate to mark. */ x: CompositeX }
);

export interface ResolvedCompositePoint {
  x: number;
  value: number | null;
  candle?: CandlePoint;
  paint?: string;
}
export interface ResolvedCompositeSeries {
  format?: ChartNumberFormat;
  id: string;
  label: string;
  kind: CompositeChartSeries["kind"];
  axis: "primary" | "secondary";
  paint: string;
  dash?: string;
  points: ResolvedCompositePoint[];
  samples: Map<number, ResolvedCompositePoint>;
}
export interface CompositeSample { key: number; value: CompositeX }
/** Appearance and stacking shared by the native plots. */
export interface CompositeOptions {
  /** Stable series-id color token map. */
  palette?: ChartPalette;
  /** Grouped columns by default, or signed stacks on each value axis. */
  columnMode?: "grouped" | "stacked";
  /** Fraction of each observation slot left empty, from zero to less than one; defaults to 0.28. */
  barPadding?: number;
  /** Category-label rotation on vertical plots; defaults to zero. */
  categoryLabelAngle?: 0 | -45 | -60;
  /** Line and candle stroke width in drawing pixels; omitted, preserves 1.5 for lines and 1 for candles. */
  strokeWidth?: number;
  /** Exact values within stacks or beyond grouped columns. Defaults to none. */
  dataLabels?: "none" | "value";
  /** Show totals above positive and below negative stacks. Defaults to false. */
  showTotals?: boolean;
}
export interface CompositeModel {
  options: CompositeOptions;
  series: ResolvedCompositeSeries[];
  samples: CompositeSample[];
  sampleDomain: [number, number];
  primaryDomain: [number, number];
  secondaryDomain: [number, number];
  categorical: boolean;
  interval: number;
  references: { id: string; label: string; paint: string; kind: "value" | "sample"; value: number; axis: "primary" | "secondary" }[];
}
export const compositePaint = (series: ChartSeries = 1) => `var(--reddb-color-series-${series})`;
export const compositeDash = (dash?: "solid" | "dashed" | "dotted") => dash === "dashed" ? "6 3" : dash === "dotted" ? "2 3" : undefined;

function valueDomain(series: ResolvedCompositeSeries[], axis: "primary" | "secondary", declared?: readonly [number, number]): [number, number] {
  let low = Infinity, high = -Infinity;
  const baseline = series.some(item => item.axis === axis && (item.kind === "column" || item.kind === "area"));
  if (declared) {
    if (!declared.every(Number.isFinite) || declared[1] <= declared[0] || !Number.isFinite(declared[1] - declared[0])) throw new Error("CompositeChart: value domains must be finite and increasing.");
    if (baseline && (declared[0] > 0 || declared[1] < 0)) throw new Error("CompositeChart: column and area domains must include zero.");
    return [...declared];
  }
  if (baseline) low = high = 0;
  for (const item of series.filter(item => item.axis === axis)) for (const point of item.points) {
    if (point.value === null) continue;
    low = Math.min(low, point.candle?.low ?? point.value);
    high = Math.max(high, point.candle?.high ?? point.value);
  }
  if (!Number.isFinite(low)) return [0, 1];
  if (low === high) { const delta = Math.max(Math.abs(low) * 0.05, 1); return baseline && low === 0 ? [0, delta] : [low - delta, high + delta]; }
  return [low, high];
}

/** Validate identities/scales and normalize coordinates once, without changing caller data. */
export function resolveCompositeChart(data: readonly CompositeChartSeries[], orientation: "vertical" | "horizontal" = "vertical", primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, references: readonly CompositeReference[] = [], timeRange?: ChartTimeRange, options: CompositeOptions = {}): CompositeModel {
  if (options.barPadding !== undefined && (!Number.isFinite(options.barPadding) || options.barPadding < 0 || options.barPadding >= 1)) throw new Error("barPadding must be in [0, 1)");
  if (options.strokeWidth !== undefined && (!Number.isFinite(options.strokeWidth) || options.strokeWidth <= 0)) throw new Error("strokeWidth must be positive");
  const viewport = chartTimeRange(timeRange);
  const identities = new Set<string>();
  const coordinates = data.flatMap(item => item.data.map(point => point.x));
  const categorical = coordinates.some(value => typeof value === "string");
  if (categorical && coordinates.some(value => typeof value !== "string")) throw new Error("CompositeChart: categories cannot be mixed with numeric or Date coordinates.");
  if (categorical && viewport) throw new Error("CompositeChart: timeRange requires numeric or Date coordinates.");
  const categories = new Map<string, number>();
  for (const value of coordinates) if (typeof value === "string" && !categories.has(value)) categories.set(value, categories.size);
  const coordinate = (value: CompositeX): number => typeof value === "string" ? categorical ? categories.get(value) ?? NaN : NaN : categorical ? NaN : +value;
  const original = new Map<number, CompositeX>();
  const automatic = automaticChartPalette(data);
  const series = data.map((item, index): ResolvedCompositeSeries => {
    if (!item.id.trim() || identities.has(item.id)) throw new Error("CompositeChart: series ids must be nonempty and unique.");
    identities.add(item.id);
    if (item.axis === "secondary" && !secondaryAxis?.label.trim()) throw new Error("CompositeChart: secondary layers require a named secondaryAxis.");
    if (item.kind === "candlestick" && orientation === "horizontal") throw new Error("CompositeChart: candles require vertical orientation.");
    const samples = new Map<number, ResolvedCompositePoint>();
    for (const point of item.data) {
      const x = coordinate(point.x);
      if (!Number.isFinite(x)) continue;
      original.set(x, point.x);
      if ("open" in point) {
        const valid = [point.open, point.high, point.low, point.close].every(Number.isFinite) && point.low <= Math.min(point.open, point.close) && point.high >= Math.max(point.open, point.close);
        samples.set(x, { x, value: valid ? point.close : null, ...(valid ? { candle: point } : {}) });
      } else samples.set(x, { x, value: typeof point.y === "number" && Number.isFinite(point.y) ? point.y : null, paint: point.color ? chartColor({ color: point.color, series: item.series }) : undefined });
    }
    return { format: (item.axis === "secondary" ? secondaryAxis : primaryAxis)?.format, id: item.id, label: item.label, kind: item.kind, axis: item.axis ?? "primary", paint: chartColor(item, options.palette, automatic), dash: compositeDash("dash" in item ? item.dash : undefined), samples, points: [...samples.values()].sort((a, b) => a.x - b.x) };
  });
  // Stable sort preserves input order for layers with the same explicit order.
  const ordered = series.map((item, index) => ({ item, order: data[index]!.order ?? index })).sort((a, b) => a.order - b.order).map(entry => entry.item);
  const allSamples = [...original].sort((a, b) => a[0] - b[0]).map(([key, value]) => ({ key, value }));
  const samples = viewport ? allSamples.filter(sample => sample.key >= viewport[0] && sample.key <= viewport[1]) : allSamples;
  let interval = Infinity;
  for (let i = 1; i < samples.length; i++) interval = Math.min(interval, samples[i]!.key - samples[i - 1]!.key);
  if (!Number.isFinite(interval)) interval = samples[0]?.value instanceof Date ? 60_000 : 1;
  const half = interval / 2;
  const sampleDomain: [number, number] = viewport ?? (samples.length ? [samples[0]!.key - half, samples.at(-1)!.key + half] : [0, 1]);
  const referenceIds = new Set<string>();
  const resolvedReferences = references.flatMap(reference => {
    if (!reference.id.trim() || referenceIds.has(reference.id)) throw new Error("CompositeChart: reference ids must be nonempty and unique.");
    referenceIds.add(reference.id);
    const value = reference.kind === "value" ? reference.value : coordinate(reference.x);
    const axis = reference.kind === "value" ? reference.axis ?? "primary" : "primary";
    if (axis === "secondary" && !secondaryAxis?.label.trim()) throw new Error("CompositeChart: secondary references require a named secondaryAxis.");
    return Number.isFinite(value) ? [{ id: reference.id, label: reference.label, paint: compositePaint(reference.series ?? 6), kind: reference.kind, value, axis } as const] : [];
  });
  const stacked = (axis: "primary" | "secondary", declared?: readonly [number, number]) => {
    if (options.columnMode !== "stacked") return valueDomain(series, axis, declared);
    const sums = new Map<number, [number, number]>();
    for (const item of series.filter(item => item.kind === "column" && item.axis === axis)) for (const point of item.points) {
      if (point.value === null) continue;
      const sum = sums.get(point.x) ?? [0, 0]; sum[point.value >= 0 ? 1 : 0] += point.value; sums.set(point.x, sum);
    }
    const stackSeries = { id: "stack", label: "Stack", kind: "column" as const, axis, paint: "", samples: new Map(), points: [...sums].flatMap(([x, pair]) => pair.map(value => ({ x, value }))) };
    return valueDomain([...series, stackSeries], axis, declared);
  };
  return { options, series: ordered, samples, interval, categorical, sampleDomain, primaryDomain: stacked("primary", primaryAxis?.domain), secondaryDomain: stacked("secondary", secondaryAxis?.domain), references: resolvedReferences };
}

/** Exact, timezone-independent default sample description. */
export function formatCompositeSample(value: CompositeX): string {
  return value instanceof Date ? value.toISOString().replace("T", " ").replace(/\.000Z$/, " UTC") : String(value);
}
/** Compact default tick labels; exact values remain in the shared readout. */
export function formatCompositeTick(value: CompositeX): string {
  return value instanceof Date ? value.toISOString().slice(5, 16).replace("T", " ") : String(value);
}
/** Nearest actual observation, using binary search rather than interpolating missing values. */
export function compositeNearest(samples: readonly CompositeSample[], value: number): number {
  let left = 0, right = samples.length - 1;
  while (left < right) { const middle = Math.floor((left + right) / 2); if (samples[middle]!.key < value) left = middle + 1; else right = middle; }
  return left > 0 && Math.abs(samples[left - 1]!.key - value) <= Math.abs(samples[left]!.key - value) ? left - 1 : left;
}
/** Keyboard sample selection, shared across native adapters. */
export function compositeKey(key: string, index: number, count: number): number | undefined {
  if (!count) return undefined;
  const next = key === "Home" ? 0 : key === "End" ? count - 1 : ["ArrowRight", "ArrowUp"].includes(key) ? index + 1 : ["ArrowLeft", "ArrowDown"].includes(key) ? index - 1 : undefined;
  return next === undefined ? undefined : Math.max(0, Math.min(count - 1, next));
}
/** Exact reading. Candle OHLC fields never collapse to just their closing value. */
export function compositeReading(series: ResolvedCompositeSeries, key: number | undefined, format: ChartNumberFormat = formatChartNumber): string {
  const point = key === undefined ? undefined : series.samples.get(key);
  if (point?.value === null || point?.value === undefined) return "No sample";
  if (!point.candle) return format(point.value);
  const p = point.candle;
  return `Open ${format(p.open)}, High ${format(p.high)}, Low ${format(p.low)}, Close ${format(p.close)}`;
}

/** One shared inspection/empty-state model for inline and maximized native adapters. */
export function compositeInspection(model: CompositeModel, hiddenSeries: readonly string[], active: number | undefined, primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, formatX = formatCompositeSample, hasLegend = true) {
  const visible = model.series.filter(series => !hiddenSeries.includes(series.id));
  const index = Math.max(0, Math.min(active ?? model.samples.length - 1, model.samples.length - 1));
  const sample = model.samples[index];
  const sampleLabel = sample ? formatX(sample.value) : "No samples";
  const readings = visible.map(series => ({ id: series.id, label: series.label, value: compositeReading(series, sample?.key, (series.axis === "primary" ? primaryAxis : secondaryAxis)?.format ?? formatChartNumber) }));
  const announcement = `${sampleLabel}. ${readings.map(reading => `${reading.label}: ${reading.value}`).join(". ")}`;
  const empty = model.series.length > 0 && visible.length === 0
    ? hasLegend ? "All series hidden. Use the legend to restore them." : "All series hidden."
    : visible.every(series => series.points.every(point => point.value === null)) ? "No valid samples in this period." : undefined;
  return { index, sample, sampleLabel, readings, announcement, empty };
}

export interface CompositeTick { value: number; label: string; position: number }
export interface CompositeLayout {
  width: number; height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  plotWidth: number; plotHeight: number;
  sampleTicks: CompositeTick[]; primaryTicks: CompositeTick[]; secondaryTicks: CompositeTick[];
  horizontal: boolean;
}
/** Bounded readable numeric tick positions, including both domain endpoints. */
function valueTicks(domain: readonly [number, number], count: number): number[] {
  const n = Math.max(1, Math.min(8, Math.floor(count)));
  return Array.from({ length: n + 1 }, (_, index) => domain[0] + index / n * (domain[1] - domain[0]));
}
export const compositeProject = (value: number, domain: readonly [number, number], length: number) => (value - domain[0]) / (domain[1] - domain[0]) * length;

/** Shared content-aware gutters and collision-free labels for native chart renderers. */
export function compositeLayout(model: CompositeModel, width: number, height: number, horizontal = false, presentation: "full" | "minimal" = "full", primaryAxis?: CompositeAxis, secondaryAxis?: CompositeAxis, formatX = formatCompositeTick): CompositeLayout {
  const primaryFormat = primaryAxis?.format ?? formatChartNumber, secondaryFormat = secondaryAxis?.format ?? formatChartNumber;
  const secondary = model.series.some(item => item.axis === "secondary") || model.references.some(item => item.axis === "secondary");
  const primaryValues = valueTicks(model.primaryDomain, horizontal ? width / 100 : height / 48);
  const secondaryValues = secondary ? valueTicks(model.secondaryDomain, horizontal ? width / 100 : height / 48) : [];
  const sampleLabels = model.samples.map(sample => formatX(sample.value));
  const textRoom = (values: string[]) => axisLabelWidth(values) + 10;
  const padding = presentation === "minimal" ? { top: 2, right: 2, bottom: 2, left: 2 } : horizontal
    ? { top: secondary ? 24 : 10, right: Math.max(textRoom([...primaryValues.map(primaryFormat), ...secondaryValues.map(secondaryFormat)]) / 2, 10), bottom: 24, left: textRoom(sampleLabels) }
    : { top: 10, right: Math.max(secondary ? textRoom(secondaryValues.map(secondaryFormat)) : 0, textRoom(sampleLabels) / 2), bottom: 24, left: Math.max(textRoom(primaryValues.map(primaryFormat)), textRoom(sampleLabels) / 2) };
  if (!horizontal && presentation === "full" && model.options?.categoryLabelAngle) {
    padding.bottom = Math.min(height * 0.4, Math.max(40, textRoom(sampleLabels) * Math.abs(Math.sin(model.options.categoryLabelAngle * Math.PI / 180)) + 18));
    padding.left = textRoom(primaryValues.map(primaryFormat)); padding.right = Math.max(12, secondary ? textRoom(secondaryValues.map(secondaryFormat)) : 12);
  }
  if (model.options?.dataLabels === "value" || model.options?.showTotals) padding.top = Math.max(padding.top, 24);
  // On a tiny container, keep a positive plot and omit text that cannot fit.
  if (padding.left + padding.right > width * 0.7) { const ratio = width * 0.7 / (padding.left + padding.right); padding.left *= ratio; padding.right *= ratio; }
  const plotWidth = Math.max(1, width - padding.left - padding.right), plotHeight = Math.max(1, height - padding.top - padding.bottom);
  const sampleLength = horizontal ? plotHeight : plotWidth;
  const sampleTicks: CompositeTick[] = [];
  let lastEnd = -Infinity;
  for (const sample of model.samples) {
    const label = formatX(sample.value), position = compositeProject(sample.key, model.sampleDomain, sampleLength);
    const extent = horizontal || model.options?.categoryLabelAngle ? 16 : axisLabelWidth([label]) + 8;
    const start = position - extent / 2, end = position + extent / 2;
    if (start < lastEnd || start < -0.5 || end > sampleLength + 0.5 || horizontal && axisLabelWidth([label]) > padding.left - 6) continue;
    sampleTicks.push({ value: sample.key, label, position }); lastEnd = end;
  }
  function ticks(values: number[], domain: [number, number], format: ChartNumberFormat, room: number): CompositeTick[] {
    let end = -Infinity;
    return values.flatMap(value => {
      const label = format(value), position = compositeProject(value, domain, horizontal ? plotWidth : plotHeight), extent = horizontal ? axisLabelWidth([label]) + 8 : 16;
      if ((!horizontal && axisLabelWidth([label]) > room - 5) || position - extent / 2 < end) return [];
      end = position + extent / 2;
      return [{ value, label, position: horizontal ? position : plotHeight - position }];
    });
  }
  return { width, height, padding, plotWidth, plotHeight, horizontal, sampleTicks, primaryTicks: ticks(primaryValues, model.primaryDomain, primaryFormat, padding.left), secondaryTicks: ticks(secondaryValues, model.secondaryDomain, secondaryFormat, padding.right) };
}
