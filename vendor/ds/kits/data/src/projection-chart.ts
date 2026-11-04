import type { CompositeChartSeries, CompositeReference } from "./core/composite-chart";
import type { VisualizationSeries } from "./visualization";
/** Observation or forecast point. Repeated times express vertical resets. */
export interface ProjectionPoint { x: number; y: number }
/** Labeled metric displayed above the chart. */
export interface ProjectionMetric { label: string; value: string }
/** A labeled event on the shared time axis. */
export interface ProjectionAnnotation { id: string; label: string; time: number }
/** Portable properties of a recorded and projected metric. */
export interface ProjectionChartContract {
  /** Visible and accessible name. */
  label: string;
  /** Prominent current value, formatted by the caller. */
  value: string;
  /** Context beside the current value. */
  context?: string;
  /** Supporting measurements. */
  metrics?: readonly ProjectionMetric[];
  /** Recorded points, in chronological order. */
  recorded: readonly ProjectionPoint[];
  /** Projected points, in chronological order. */
  projected: readonly ProjectionPoint[];
  /** Time at which the forecast starts. */
  now: number;
  /** Axis range, which must include zero because the recorded area is filled. */
  valueDomain: readonly [number, number];
  /** Additional events shown as labeled references. */
  annotations?: readonly ProjectionAnnotation[];
  /** Name of the time marker. */
  nowLabel?: string;
  /** Legend label of the recorded series. */
  recordedLabel?: string;
  /** Legend label of the projected series. */
  projectedLabel?: string;
  /** Semantic series role. */
  series?: VisualizationSeries;
  /** Axis and readout formatter for values. */
  formatValue?: (value: number) => string;
  /** Axis and readout formatter for time. */
  formatTime?: (value: number) => string;
}
export function projectionChartModel(props: ProjectionChartContract): { data: CompositeChartSeries[]; references: CompositeReference[] } {
  const { recorded, projected, now, valueDomain, annotations = [], series = 1, nowLabel = "Now", recordedLabel = "Recorded", projectedLabel = "Projected" } = props;
  if (!Number.isFinite(now)) throw new Error("ProjectionChart: now must be finite");
  if (!valueDomain.every(Number.isFinite) || valueDomain[0] > 0 || valueDomain[1] <= 0 || valueDomain[0] >= valueDomain[1]) throw new Error("ProjectionChart: valueDomain must be finite, increasing and include zero");
  for (const points of [recorded, projected]) for (let i = 0; i < points.length; i++) {
    const point = points[i]!;
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || (i > 0 && point.x < points[i - 1]!.x)) throw new Error("ProjectionChart: points must be finite and ordered by time");
  }
  const ids = new Set(["now"]);
  for (const annotation of annotations) {
    if (!annotation.id || ids.has(annotation.id) || !Number.isFinite(annotation.time)) throw new Error("ProjectionChart: annotation ids must be unique and times finite");
    ids.add(annotation.id);
  }
  return { data: [
    { id: "recorded", label: recordedLabel, kind: "area", data: recorded, series, gradient: true, preserveDuplicateX: true },
    { id: "projected", label: projectedLabel, kind: "line", data: projected, series, dash: "dashed", preserveDuplicateX: true },
  ], references: [{ id: "now", label: nowLabel, kind: "sample", x: now, showLabel: true }, ...annotations.map(item => ({ id: item.id, label: item.label, kind: "sample" as const, x: item.time, showLabel: true }))] };
}
