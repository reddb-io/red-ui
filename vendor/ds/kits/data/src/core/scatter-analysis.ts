import type { ScatterPoint } from "../scatter";
import { scatterData, regression } from "../scatter";
import { domain } from "../visualization";
import { automaticChartColors, chartColor, type ChartPalette } from "./chart-color";
/** Quantitative scale, independently chosen per axis. */
export type ScatterScale = "linear" | "log";
/** An application-owned highlighted measurement region. */
export interface ScatterRegion {
  /** Optional color custom-property name for the region fill. */
  color?: import("./chart-color").ColorToken;
  /** Unique region identity. */
  id: string;
  /** Human-readable region meaning. */
  label: string;
  /** Increasing horizontal region bounds in original units. */
  x: readonly [number, number];
  /** Increasing vertical region bounds in original units. */
  y: readonly [number, number];
}
/** Shared analytical overlays and scale semantics. */
export interface ScatterAnalysisOptions {
  /** Horizontal measurement scale; log requires positive values. Defaults to linear. */
  xScale?: ScatterScale;
  /** Vertical measurement scale; log requires positive values. Defaults to linear. */
  yScale?: ScatterScale;
  /** Directions defining the nondominated frontier; independent of regression. */
  pareto?: { x: "minimize" | "maximize"; y: "minimize" | "maximize" };
  /** Show collision-managed point labels. Defaults to false on Scatter and true on Quadrant. */
  pointLabels?: boolean;
  /** Highlighted regions, clipped to the visible domains. */
  highlights?: readonly ScatterRegion[];
  /** Stable entity-id color token map. */
  palette?: ChartPalette;
  /** Positive stroke width for analytical lines; defaults to 1.5. */
  strokeWidth?: number;
}
export function scaleProject(value: number, range: readonly [number, number], start: number, end: number, scale: ScatterScale = "linear") {
  const transform = (n: number) => scale === "log" ? Math.log10(n) : n;
  return start + (transform(value) - transform(range[0])) / (transform(range[1]) - transform(range[0])) * (end - start);
}
export function scaleTicks(range: readonly [number, number], scale: ScatterScale = "linear", count = 4) {
  return Array.from({ length: count + 1 }, (_, i) => scale === "log" ? 10 ** (Math.log10(range[0]) + i / count * Math.log10(range[1] / range[0])) : range[0] + i / count * (range[1] - range[0]));
}
/** Nondominated observations; exact coordinate ties keep the first stable observation. */
export function paretoFrontier(data: readonly ScatterPoint[], directions: NonNullable<ScatterAnalysisOptions["pareto"]>) {
  const sx = directions.x === "minimize" ? 1 : -1, sy = directions.y === "minimize" ? 1 : -1;
  const sorted = [...data].sort((a, b) => sx * (a.x - b.x) || sy * (a.y - b.y));
  let best = Infinity;
  return sorted.filter(point => { const y = sy * point.y; if (y >= best) return false; best = y; return true; }).sort((a, b) => a.x - b.x);
}
export function scatterAnalysis(data: readonly ScatterPoint[], options: ScatterAnalysisOptions, xDomain?: readonly [number, number], yDomain?: readonly [number, number], trend = false) {
  const points = automaticChartColors(scatterData(data).map(point => ({ ...point, color: point.color ?? options.palette?.[point.id] }))), xd = domain(points.map(p => p.x), xDomain), yd = domain(points.map(p => p.y), yDomain);
  for (const axis of ["x", "y"] as const) {
    const range = axis === "x" ? xd : yd;
    if (options[`${axis}Scale`] === "log" && (range[0] <= 0 || points.some(p => p[axis] <= 0))) throw new Error(`Logarithmic ${axis} scale requires positive observations and domain`);
  }
  if (options.strokeWidth !== undefined && (!Number.isFinite(options.strokeWidth) || options.strokeWidth <= 0)) throw new Error("strokeWidth must be positive");
  const ids = new Set<string>();
  const highlights = (options.highlights ?? []).flatMap(region => {
    if (!region.id || ids.has(region.id) || [...region.x, ...region.y].some(v => !Number.isFinite(v)) || region.x[0] >= region.x[1] || region.y[0] >= region.y[1]) throw new Error("Invalid or duplicate scatter highlight");
    ids.add(region.id);
    const x: [number, number] = [Math.max(xd[0], region.x[0]), Math.min(xd[1], region.x[1])], y: [number, number] = [Math.max(yd[0], region.y[0]), Math.min(yd[1], region.y[1])];
    return x[0] < x[1] && y[0] < y[1] ? [{ ...region, x, y }] : [];
  });
  const fit = trend ? regression(points) : undefined;
  const line = fit && (options.xScale === "log" || options.yScale === "log") ? Array.from({ length: 65 }, (_, index) => {
    const a = fit[0]!, b = fit[1]!, x = a.x + (b.x - a.x) * index / 64;
    return { x, y: a.y + (b.y - a.y) * index / 64 };
  }) : fit;
  return { points, xd, yd, frontier: options.pareto ? paretoFrontier(points, options.pareto) : [], line, highlights };
}
/** Deterministic label placement in the measured plot, shared by both native adapters. */
export function scatterDrawing(model: ReturnType<typeof scatterAnalysis>, options: ScatterAnalysisOptions, width: number, height: number, formatX: (n: number) => string, formatY: (n: number) => string) {
  const left = Math.min(width * 0.25, Math.max(44, ...scaleTicks(model.yd, options.yScale).map(v => formatY(v).length * 7 + 12))), right = width - 20, top = 28, bottom = height - 44;
  const px = (value: number) => scaleProject(value, model.xd, left, right, options.xScale), py = (value: number) => scaleProject(value, model.yd, bottom, top, options.yScale);
  const boxes: { x: number; y: number; w: number; h: number }[] = [];
  const points = model.points.map(point => {
    const x = px(point.x), y = py(point.y), text = point.label.length > 30 ? point.label.slice(0, 29) + "…" : point.label, w = Math.min(text.length * 6.5, right - left);
    let label: { x: number; y: number; anchor: "start" | "end"; text: string } | undefined;
    if (options.pointLabels && x >= left && x <= right && y >= top && y <= bottom) for (const [dx, dy, anchor] of [[9, -8, "start"], [9, 14, "start"], [-9, -8, "end"], [-9, 14, "end"]] as const) {
      const box = { x: x + dx - (anchor === "end" ? w : 0), y: y + dy - 11, w, h: 14 };
      if (box.x < left || box.x + w > right || box.y < top || box.y + box.h > bottom || boxes.some(b => box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y)) continue;
      boxes.push(box); label = { x: x + dx, y: y + dy, anchor, text }; break;
    }
    return { ...point, x, y, paint: chartColor(point, options.palette), caption: label };
  });
  return { left, right, top, bottom, points, path: (points: readonly { x: number; y: number }[]) => points.reduce<{ parts: string[]; open: boolean }>((result, p) => {
      const x = px(p.x), y = py(p.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) { result.open = false; return result; }
      result.parts.push(`${result.open ? "L" : "M"}${x},${y}`); result.open = true; return result;
    }, { parts: [], open: false }).parts.join(" "),
    xTicks: scaleTicks(model.xd, options.xScale).map(value => ({ value, position: px(value), label: formatX(value) })), yTicks: scaleTicks(model.yd, options.yScale).map(value => ({ value, position: py(value), label: formatY(value) })),
    regions: model.highlights.map(r => ({ ...r, x: px(r.x[0]), y: py(r.y[1]), width: px(r.x[1]) - px(r.x[0]), height: py(r.y[0]) - py(r.y[1]) })),
  };
}
