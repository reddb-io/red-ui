import type { CompositeChartContract } from "./compositechart";
import type { BarCategory, BarSeries } from "../bar-chart";
/** Categorical comparison over the canonical mixed-chart drawing. */
export interface BarChartContract extends Omit<CompositeChartContract, "data" | "formatX"> {
  /** Categories with single values or contributions keyed by series id. */
  data: readonly BarCategory[];
  /** Named series for grouped or stacked contributions; omitted, draws one observation per category. */
  series?: readonly BarSeries[];
  /** Preserves input order by default; comparisons may sort by category total. */
  sort?: "input" | "ascending" | "descending";
}
