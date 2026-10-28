import type { PieSlice } from "../circular-chart";
import type { ChartPalette } from "../chart-color";
import type { ChartHeight, ChartSize, ChartLayout } from "../../chart";
/** Portable pie chart contract, with independently controlled selection. */
export interface PieChartContract {
  /** Nonnegative contributions with unique stable ids. */
  data: readonly PieSlice[];
  /** Visible chart title and accessible name. */
  label: string;
  /** Context, unit or sampling explanation. */
  description?: string;
  /** Entity-id color token map, overridden by each item's color. */
  palette?: ChartPalette;
  /** Selected slice id, or null for the total. Bindable. */
  selected?: string | null;
  /** Enables pointer and keyboard selection; defaults to true. */
  interactive?: boolean;
  /** Formats exact values in the center, legend and data table. */
  format?: (value: number) => string;
  /** Compact toggles or no legend. Defaults to compact. */
  legend?: "compact" | "hidden";
  /** Labels on sufficiently large slices; exact readings always remain in the table. */
  labels?: "none" | "value" | "percent";
  /** Shared compact or roomy chart chrome; defaults to roomy. */
  layout?: ChartLayout;
  /** Density-relative plot height. Omitted, roomy uses ten rows and dense uses six; an explicit size wins. */
  size?: ChartSize;
  /** Plot height in pixels, or fill for a bounded parent. */
  height?: ChartHeight;
  /** Offers the viewport-filling expanded chart. Defaults to true. */
  expandable?: boolean;
  /** Expanded view state, bindable. */
  expanded?: boolean;
}
