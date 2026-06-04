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

export interface SecretReference {
  type: "secret_ref";
  store?: string;
  collection?: string;
  key: string;
  masked?: boolean;
}

export interface SecretEntry {
  key: string;
  value: "***";
  status?: string;
  version?: number;
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

function readSecretReference(value: unknown): SecretReference | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "&***") {
      return { type: "secret_ref", key: "***", masked: true };
    }
    if (/^&[A-Za-z0-9_.-]+$/.test(trimmed)) {
      return { type: "secret_ref", key: trimmed.slice(1) };
    }
    return undefined;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const ref = value as Record<string, unknown>;
  if (ref.type !== "secret_ref") return undefined;
  const key =
    optionalString(ref.key) ??
    optionalString(ref.path) ??
    optionalString(ref.name);
  if (!key) return undefined;

  const secretRef: SecretReference = { type: "secret_ref", key };
  const store = optionalString(ref.store);
  const collection = optionalString(ref.collection);
  if (store) secretRef.store = store;
  if (collection) secretRef.collection = collection;
  if (key === "***") secretRef.masked = true;
  return secretRef;
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
      value: readSecretReference(values.value) ?? values.value,
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

export function parseShowSecretsResult(result: QueryResult): SecretEntry[] {
  if (!result.ok) throw new Error(result.error ?? "SHOW SECRETS failed");

  const entries: SecretEntry[] = [];
  for (const record of result.result.records) {
    const values = record.values;
    const key = optionalString(values.key);
    if (!key) continue;

    const value = values.value;
    if (value !== "***") {
      throw new Error("SHOW SECRETS returned an unmasked secret value");
    }

    const entry: SecretEntry = { key, value: "***" };
    const status = optionalString(values.status);
    const version = optionalNumber(values.version);
    if (status) entry.status = status;
    if (version !== undefined) entry.version = version;
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

  async showSecrets(prefix?: string): Promise<SecretEntry[]> {
    const suffix = normalizeConfigPrefix(prefix);
    const result = await this.transport.query(
      suffix ? `SHOW SECRETS ${suffix}` : "SHOW SECRETS"
    );
    return parseShowSecretsResult(result);
  }
}
