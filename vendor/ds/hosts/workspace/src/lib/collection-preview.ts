import type { Capability } from "./renderers/types";

export function safeCollectionName(collection: string): string {
  return collection.replace(/[^A-Za-z0-9_./-]/g, "");
}

export function collectionPreviewQuery(
  collection: string,
  capability: Capability | undefined
): string {
  const safe = safeCollectionName(collection);
  if (capability === "kv") return `LIST KV ${safe} LIMIT 200`;
  return `SELECT * FROM ${safe} LIMIT 200`;
}
