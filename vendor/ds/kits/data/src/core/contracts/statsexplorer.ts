import type { StatsMetric } from "../../stats-explorer";
/** Portable numeric statistics supplied by the caller. */
export interface StatsExplorerContract {
  /** Accessible name of the statistics surface. */
  label: string;
  /** Measured values; no values are fabricated by the component. */
  metrics: readonly StatsMetric[];
  /** Optional context displayed beside the count. */
  context?: string;
  /** Message displayed when there are no numeric values. */
  emptyLabel?: string;
}
