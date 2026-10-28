import { arc } from "d3-shape";
import { ringThickness } from "@reddb-io/design-system/base/recipes";
import { automaticChartPalette, chartColor, type ColorToken, type ChartPalette } from "./chart-color";
import { unique, finite } from "../visualization";
/** A nonnegative, independently selectable contribution. */
export interface PieSlice {
  /** Stable identity, retained across sorting and refresh. */
  id: string;
  /** Visible name of the contribution. */
  label: string;
  /** Observed nonnegative finite value. */
  value: number;
  /** Optional DS categorical role. */
  series?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Optional color custom-property name. */
  color?: ColorToken;
}
/** Reading passed to a donut's custom center. */
export interface DonutReading {
  /** Total across all contributions, independent of selection. */
  total: number;
  /** Selected observed item, absent for the total view. */
  selected?: PieSlice;
  /** Current selected reading, or the total. */
  value: number;
  /** Selected share, or one hundred for a nonempty total. */
  percent: number;
}
export function circularModel(data: readonly PieSlice[], thickness: number | undefined, selected?: string | null, palette?: ChartPalette) {
  unique(data, "PieChart");
  if (thickness !== undefined) ringThickness(thickness);
  let total = 0;
  for (const item of data) { finite(item.value, item.id); if (item.value < 0) throw new Error("PieChart: contributions must be nonnegative"); total += item.value; }
  finite(total, "PieChart total");
  let angle = 0;
  const shape = arc().outerRadius(100).innerRadius(thickness === undefined ? 0 : 100 * (1 - thickness));
  const automatic = automaticChartPalette(data);
  const slices = data.map((item, index) => {
    const fraction = total ? item.value / total : 0, startAngle = angle;
    angle += fraction * Math.PI * 2;
    const geometry = { startAngle, endAngle: angle, innerRadius: 0, outerRadius: 100 };
    return { ...item, fraction, paint: chartColor(item, palette, automatic), path: fraction ? shape(geometry) ?? "" : "", centroid: shape.centroid(geometry) };
  });
  const active = data.find(item => item.id === selected);
  const reading: DonutReading = { total, selected: active, value: active?.value ?? total, percent: total ? (active ? active.value / total : 1) * 100 : 0 };
  return { slices, reading };
}

/** Move focus between actual graphical marks, without conflating focus and selection. */
export function circularFocus(event: KeyboardEvent): void {
  const target = event.target as Element | null;
  const root = target?.closest("[data-circular-plot]");
  if (!root || !target) return;
  const marks = [...root.querySelectorAll<SVGElement>('[data-mark-id][role="button"]')];
  const current = marks.findIndex(mark => mark.contains(target));
  if (current < 0 || !marks.length) return;
  const next = event.key === "Home" ? 0 : event.key === "End" ? marks.length - 1 : ["ArrowRight", "ArrowDown"].includes(event.key) ? (current + 1) % marks.length : ["ArrowLeft", "ArrowUp"].includes(event.key) ? (current - 1 + marks.length) % marks.length : undefined;
  if (next !== undefined) { event.preventDefault(); marks[next]?.focus(); }
}
