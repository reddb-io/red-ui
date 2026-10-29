import type { EventSeries } from "../../event-series-explorer";
/** Portable event series inspection. */
export interface EventSeriesExplorerContract {
  /** Accessible name of the data region. */
  label: string;
  /** Named series with time-sorted observations and original event fields. */
  series: readonly EventSeries[];
  /** Optional collection or dataset name. */
  context?: string;
  /** Message when the result has no time and value shape. */
  emptyLabel?: string;
}
