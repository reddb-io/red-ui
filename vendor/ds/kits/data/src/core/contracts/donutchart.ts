import type { PieChartContract } from "./piechart";
/** Pie selection and reading rendered as a configurable ring. */
export interface DonutChartContract extends PieChartContract {
  /** Ring width as fraction of outer radius, strictly between zero and one; defaults to 0.25. */
  thickness?: number;
}
