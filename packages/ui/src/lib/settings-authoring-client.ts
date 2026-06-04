import type { QueryResult } from "./reddb/client";

export type ConfigValueType =
  | "bool"
  | "boolean"
  | "int"
  | "integer"
  | "float"
  | "number"
  | "count"
  | "string"
  | "text"
  | "url"
  | "object"
  | "array"
  | "list";

export interface ConfigEntry {
  key: string;
  value: unknown;
  collection?: string;
  version?: number;
  valueType?: ConfigValueType;
  schemaVersion?: number;
  tags?: unknown;
}

export interface QueryTransport {
  query(sql: string): Promise<QueryResult>;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function readValueType(
  values: Record<string, unknown>
): ConfigValueType | undefined {
  const raw =
    optionalString(values.value_type) ??
    optionalString(values.valueType) ??
    optionalString(values["value-type"]);
  return raw?.toLowerCase() as ConfigValueType | undefined;
}

function readSchemaVersion(
  values: Record<string, unknown>
): number | undefined {
  return (
    optionalNumber(values.schema_version) ??
    optionalNumber(values.schemaVersion) ??
    optionalNumber(values["schema-version"])
  );
}

function normalizeConfigPrefix(prefix: string | undefined): string | undefined {
  const suffix = prefix?.trim();
  if (!suffix) return undefined;
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(suffix)) {
    throw new Error("SHOW CONFIG prefix must be a dotted identifier path");
  }
  return suffix;
}

export function parseShowConfigResult(result: QueryResult): ConfigEntry[] {
  if (!result.ok) throw new Error(result.error ?? "SHOW CONFIG failed");

  const entries: ConfigEntry[] = [];
  for (const record of result.result.records) {
    const values = record.values;
    const key = optionalString(values.key);
    if (!key || values.tombstone === true) continue;

    const entry: ConfigEntry = {
      key,
      value: values.value,
    };
    const collection = optionalString(values.collection);
    const version = optionalNumber(values.version);
    const valueType = readValueType(values);
    const schemaVersion = readSchemaVersion(values);

    if (collection) entry.collection = collection;
    if (version !== undefined) entry.version = version;
    if (valueType) entry.valueType = valueType;
    if (schemaVersion !== undefined) entry.schemaVersion = schemaVersion;
    if ("tags" in values) entry.tags = values.tags;
    entries.push(entry);
  }

  return entries.sort((left, right) => left.key.localeCompare(right.key));
}

export class SettingsAuthoringClient {
  constructor(private readonly transport: QueryTransport) {}

  async showConfig(prefix?: string): Promise<ConfigEntry[]> {
    const suffix = normalizeConfigPrefix(prefix);
    const result = await this.transport.query(
      suffix ? `SHOW CONFIG ${suffix}` : "SHOW CONFIG"
    );
    return parseShowConfigResult(result);
  }
}
