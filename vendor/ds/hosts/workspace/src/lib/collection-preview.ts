import type { RedClient } from "./reddb/index";
import { sqlString } from "./collection-catalog";

export function safeCollectionName(collection: string): string {
  return collection.replace(/[^A-Za-z0-9_./-]/g, "");
}

export function collectionPreviewQuery(
  collection: string,
  model?: string | null,
): string {
  const safe = safeCollectionName(collection);
  // A key/value renderer also handles Config, Vault and table-shaped data.
  // Only the catalog model can authorize a model-specific read command.
  switch (model?.toLowerCase()) {
    case "kv":
      return `LIST KV ${safe} LIMIT 200`;
    case "config":
      return `LIST CONFIG ${safe} LIMIT 200`;
    case "vault":
      return `LIST VAULT ${safe} LIMIT 200`;
  }
  return `SELECT * FROM ${safe} LIMIT 200`;
}

export async function fetchCollectionPreview(
  client: RedClient,
  collection: string,
) {
  let model: string | null = null;
  try {
    const catalog = await client.query(
      `SELECT model FROM red.collections WHERE name = ${sqlString(collection)} LIMIT 1`,
    );
    const value = catalog.result.records[0]?.values.model;
    if (typeof value === "string") model = value;
  } catch {
    // A missing catalog or denied metadata read must not turn a shape hint
    // into LIST KV against an unknown physical collection model.
  }
  const query = collectionPreviewQuery(collection, model);
  try {
    return await client.query(query);
  } catch (error) {
    // Older RedDB parsers do not accept every native LIST form (notably
    // dotted Vault names). Preserve their existing SELECT preview without
    // retrying permission failures or model mismatches through another path.
    if (
      query.startsWith("LIST ") &&
      error instanceof Error &&
      /parse error|unable to detect query mode/i.test(error.message)
    ) {
      return client.query(collectionPreviewQuery(collection, undefined));
    }
    throw error;
  }
}
