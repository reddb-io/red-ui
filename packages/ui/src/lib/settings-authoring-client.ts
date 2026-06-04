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

export interface RevealedSecret {
  key: string;
  value: string;
}

export interface QueryTransport {
  query(sql: string): Promise<QueryResult>;
}

export type ConfigMutationValue =
  | string
  | number
  | boolean
  | null
  | unknown[]
  | Record<string, unknown>;

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
  return normalizeConfigPath(suffix, "SHOW CONFIG prefix");
}

function normalizeConfigPath(path: string, label: string): string {
  const trimmed = path.trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(trimmed)) {
    throw new Error(`${label} must be a dotted identifier path`);
  }
  return trimmed;
}

function quoteSqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function configValueToSqlLiteral(value: ConfigMutationValue): string {
  if (value === null) return "NULL";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Config number value must be finite");
    }
    return String(value);
  }
  if (typeof value === "string") return quoteSqlString(value);
  return JSON.stringify(value);
}

export function buildSetConfigStatement(
  key: string,
  value: ConfigMutationValue
): string {
  return `SET CONFIG ${normalizeConfigPath(
    key,
    "SET CONFIG key"
  )} = ${configValueToSqlLiteral(value)}`;
}

export function buildDeleteConfigStatement(key: string): string {
  const normalized = normalizeConfigPath(key, "DELETE CONFIG key");
  const splitAt = normalized.lastIndexOf(".");
  if (splitAt <= 0 || splitAt === normalized.length - 1) {
    throw new Error("DELETE CONFIG key must include a collection and key");
  }
  return `DELETE CONFIG ${normalized.slice(0, splitAt)} ${normalized.slice(
    splitAt + 1
  )}`;
}

export function buildSetSecretStatement(key: string, value: string): string {
  return `SET SECRET ${normalizeConfigPath(
    key,
    "SET SECRET key"
  )} = ${quoteSqlString(value)}`;
}

export function buildDeleteSecretStatement(key: string): string {
  return `DELETE SECRET ${normalizeConfigPath(key, "DELETE SECRET key")}`;
}

export function buildRevealSecretStatement(key: string): string {
  return `UNSEAL VAULT ${normalizeConfigPath(key, "UNSEAL VAULT key")}`;
}

export function parseConfigMutationResult(
  result: QueryResult,
  operation: "SET CONFIG" | "DELETE CONFIG"
): QueryResult {
  if (!result.ok) throw new Error(result.error ?? `${operation} failed`);
  return result;
}

export function parseSecretMutationResult(
  result: QueryResult,
  operation: "SET SECRET" | "DELETE SECRET"
): QueryResult {
  if (!result.ok) throw new Error(result.error ?? `${operation} failed`);
  return {
    ...result,
    query: operation,
    record_count: 0,
    result: { columns: [], records: [] },
  };
}

export function parseRevealSecretResult(
  result: QueryResult,
  key: string
): RevealedSecret {
  if (!result.ok) throw new Error(result.error ?? "UNSEAL VAULT failed");

  for (const record of result.result.records) {
    const values = record.values;
    const rowKey = optionalString(values.key);
    if (rowKey && rowKey !== key) continue;

    const value = values.value ?? values.plaintext ?? values.secret;
    if (typeof value === "string") return { key, value };
  }

  throw new Error("UNSEAL VAULT returned no plaintext value");
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

  async setConfig(
    key: string,
    value: ConfigMutationValue
  ): Promise<QueryResult> {
    const result = await this.transport.query(
      buildSetConfigStatement(key, value)
    );
    return parseConfigMutationResult(result, "SET CONFIG");
  }

  async unsetConfig(key: string): Promise<QueryResult> {
    const result = await this.transport.query(buildDeleteConfigStatement(key));
    return parseConfigMutationResult(result, "DELETE CONFIG");
  }

  async setSecret(key: string, value: string): Promise<QueryResult> {
    const result = await this.transport.query(
      buildSetSecretStatement(key, value)
    );
    return parseSecretMutationResult(result, "SET SECRET");
  }

  async deleteSecret(key: string): Promise<QueryResult> {
    const result = await this.transport.query(buildDeleteSecretStatement(key));
    return parseSecretMutationResult(result, "DELETE SECRET");
  }

  async revealSecret(key: string): Promise<RevealedSecret> {
    const normalized = normalizeConfigPath(key, "UNSEAL VAULT key");
    const result = await this.transport.query(
      buildRevealSecretStatement(normalized)
    );
    return parseRevealSecretResult(result, normalized);
  }
}
