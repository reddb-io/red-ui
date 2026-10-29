import type { QueryResult } from "#reddb";
import { extractKv } from "@reddb-io/design-system/adapters/reddb/kv-results";
import { renderKvSnapshot } from "@reddb-io/design-system/data/key-value-explorer";
export {
  extractKv,
  hasKvShape,
} from "@reddb-io/design-system/adapters/reddb/kv-results";
export * from "@reddb-io/design-system/data/key-value-explorer";
export function renderKvHtml(result: QueryResult): string {
  return renderKvSnapshot(extractKv(result));
}
