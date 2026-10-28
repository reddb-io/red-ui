import type { SkeletonShape } from "@reddb-io/design-system/base/recipes";
import type { CompositeModel } from "./composite-chart";

/** Match the pending drawing without importing its rendering engine. */
export function compositeSkeletonShape(model: CompositeModel, orientation: "horizontal" | "vertical"): SkeletonShape {
  const kinds = new Set(model.series.map(series => series.kind));
  if (kinds.has("candlestick")) return "candlestick";
  if (kinds.size > 1) return "combo";
  if (kinds.has("column")) return orientation === "horizontal" ? "bar" : "column";
  return kinds.has("area") ? "area" : "line";
}
