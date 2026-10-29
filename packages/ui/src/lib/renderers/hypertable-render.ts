import type { QueryResult } from "#reddb";
import { extractSeries } from "@reddb-io/design-system/adapters/reddb/time-series-results";
import { renderEventSeriesSnapshot } from "@reddb-io/design-system/data/event-series-explorer";
export {
  extractSeries,
  pickTimeColumn,
  numericColumns,
  hasHypertableShape,
} from "@reddb-io/design-system/adapters/reddb/time-series-results";
export * from "@reddb-io/design-system/data/event-series-explorer";
export function renderHypertableHtml(
  result: QueryResult,
  metric?: string
): string {
  return renderEventSeriesSnapshot(extractSeries(result, metric));
}
