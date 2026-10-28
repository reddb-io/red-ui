import { tv } from "tailwind-variants";
import { CHART_ROWS, type ChartHeight, type ChartLayout, type ChartReadout, type ChartSize } from "./chart";

/** Native adapters share one container-query and Density-aware chart layout. */
export const chartSurface = tv({
  base: "@container/chart group/chart relative flex min-h-0 min-w-0 flex-col",
  variants: { fill: { true: "h-full", false: "" } },
});

const overlay = [
  "pointer-events-none invisible absolute inset-x-0 bottom-0 z-10",
  "group-hover/chart:visible group-focus-within/chart:visible group-data-[chart-inspecting]/chart:visible",
  "border border-muted bg-elevation-overlay-surface px-[var(--reddb-spatial-inset-sm)]",
].join(" ");

/** Readout placement never changes the explorer's accessible value. */
export function chartReadout(layout: ChartLayout, mode: ChartReadout): string {
  if (mode === "hidden") return "sr-only";
  if (mode === "inline" || mode === "auto" && layout === "roomy") return "";
  if (mode === "overlay" || layout === "dense") return overlay;
  return `${overlay} @lg/chart:visible @lg/chart:static @lg/chart:border-0 @lg/chart:bg-transparent @lg/chart:px-0`;
}

/** Default height before measurement; explicit size or height always wins. */
export function chartRows(layout: ChartLayout, legacyRows: number, size?: ChartSize): number {
  return size ? CHART_ROWS[size] : layout === "dense" ? Math.min(6, legacyRows) : legacyRows;
}

/** CSS reserves the drawing before the optional engine is loaded, including in SSR. */
export function chartHeightStyle(layout: ChartLayout, legacyRows: number, size?: ChartSize, height?: ChartHeight): string | undefined {
  if (height === "fill") return undefined;
  if (typeof height === "number") return `${height}px`;
  if (layout === "auto" && size === undefined) return "calc(var(--reddb-spatial-control-height-md) * var(--chart-layout-rows, 6))";
  return `calc(var(--reddb-spatial-control-height-md) * ${chartRows(layout, legacyRows, size)})`;
}

/** Small containers use six rows; wider surfaces keep the caller's normal geometry. */
export function chartAdaptiveHeight(layout: ChartLayout, legacyRows: number, size?: ChartSize, height?: ChartHeight): string {
  if (layout !== "auto" || size !== undefined || height !== undefined) return "";
  return legacyRows <= 6
    ? "[--chart-layout-rows:6]"
    : "[--chart-layout-rows:6] @lg/chart:[--chart-layout-rows:10]";
}
