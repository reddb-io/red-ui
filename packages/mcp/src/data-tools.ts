// Server-side data tools for the MCP App (#49, ADR-0006).
//
// `query` / `list` / `get` run a server-side RedClient against the resolved
// connection and return reddb results to the *model* as `structuredContent` —
// the model reads data directly without driving the visual iframe. Read-shaped
// only: `query` rejects any statement that is not a read (default-deny), and
// `list`/`get` build SELECTs. No secret/token is logged or returned.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";
import {
  RedClient,
  runQueryPreferStream,
  type QueryResult,
  type ReadClient,
} from "./red-client.js";
import {
  resolveConnection,
  type ResolveConnectionOptions,
} from "./connection.js";

/** MCP tool result shape we build (subset of the SDK's CallToolResult). The
 *  index signature keeps it assignable to the SDK's `CallToolResult`. */
interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: Record<string, unknown>;
  isError?: boolean;
  [k: string]: unknown;
}

/** Leading verbs we accept as read-shaped. Everything else is denied — a
 *  default-deny allowlist keeps write/DDL statements out of read tools even as
 *  reddb's query surface grows. */
const READ_VERBS = new Set([
  "select",
  "with",
  "show",
  "explain",
  "describe",
  "desc",
  "match", // graph traversal read
]);

/** Strip leading line/block comments + whitespace, then return the first token
 *  lower-cased. Used to gate the `query` tool to read-shaped statements. */
export function leadingVerb(sql: string): string {
  let s = sql.trim();
  // Drop leading -- line comments and /* */ block comments.
  for (;;) {
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      s = nl === -1 ? "" : s.slice(nl + 1).trim();
    } else if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      s = end === -1 ? "" : s.slice(end + 2).trim();
    } else {
      break;
    }
  }
  const m = /^[a-z]+/i.exec(s);
  return m ? m[0].toLowerCase() : "";
}

export function isReadOnlyQuery(sql: string): boolean {
  return READ_VERBS.has(leadingVerb(sql));
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Reject anything that is not a bare SQL identifier (collection / column). */
function assertIdentifier(value: string, label: string): string {
  if (!IDENT_RE.test(value)) {
    throw new Error(
      `Invalid ${label} "${value}": expected a bare identifier (letters, digits, underscore).`
    );
  }
  return value;
}

/** Render an id literal for a WHERE clause: numbers inline, strings single-quoted
 *  with embedded quotes doubled. */
function idLiteral(id: string | number): string {
  if (typeof id === "number") {
    if (!Number.isFinite(id)) throw new Error(`Invalid numeric id: ${id}`);
    return String(id);
  }
  return `'${id.replaceAll("'", "''")}'`;
}

function ok(text: string, structured: Record<string, unknown>): ToolResult {
  return { content: [{ type: "text", text }], structuredContent: structured };
}

function fail(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    structuredContent: { ok: false, error: message },
    isError: true,
  };
}

function shapeQueryResult(
  r: QueryResult,
  baseUrl: string,
  mode: string
): Record<string, unknown> {
  const records = r.result?.records?.map((rec) => rec.values) ?? [];
  return {
    ok: r.ok !== false,
    query: r.query,
    columns: r.result?.columns ?? [],
    records,
    recordCount: r.record_count ?? records.length,
    streamed: r.streamed ?? false,
    truncated: r.truncated ?? false,
    baseUrl,
    mode,
  };
}

// ---- Pure handlers (injectable client) — the unit-testable core. ----------

export async function runQueryTool(
  client: ReadClient,
  args: { query: string; maxRows?: number },
  conn: { baseUrl: string; mode: string }
): Promise<ToolResult> {
  if (!isReadOnlyQuery(args.query)) {
    return fail(
      `Refused: "${leadingVerb(args.query) || "(empty)"}" is not a read statement. The query tool runs read-shaped statements only (SELECT/WITH/SHOW/EXPLAIN/DESCRIBE/MATCH).`
    );
  }
  try {
    const r = await runQueryPreferStream(client, args.query, {
      maxRows: args.maxRows,
    });
    const structured = shapeQueryResult(r, conn.baseUrl, conn.mode);
    return ok(
      `${structured.recordCount} row(s) from ${conn.baseUrl}${structured.truncated ? " (truncated)" : ""}.`,
      structured
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runListTool(
  client: ReadClient,
  args: { collection?: string; maxRows?: number },
  conn: { baseUrl: string; mode: string }
): Promise<ToolResult> {
  try {
    // No collection → list collection names. With one → list its rows (a read).
    if (!args.collection) {
      const collections = await client.collections();
      return ok(`${collections.length} collection(s) on ${conn.baseUrl}.`, {
        ok: true,
        collections,
        count: collections.length,
        baseUrl: conn.baseUrl,
        mode: conn.mode,
      });
    }
    const name = assertIdentifier(args.collection, "collection");
    const limit = args.maxRows ?? 100;
    const r = await runQueryPreferStream(
      client,
      `SELECT * FROM ${name} LIMIT ${limit}`,
      { maxRows: limit }
    );
    const structured = shapeQueryResult(r, conn.baseUrl, conn.mode);
    structured.collection = name;
    return ok(
      `${structured.recordCount} row(s) from ${name} on ${conn.baseUrl}${structured.truncated ? " (truncated)" : ""}.`,
      structured
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function runGetTool(
  client: ReadClient,
  args: { collection: string; id: string | number; idColumn?: string },
  conn: { baseUrl: string; mode: string }
): Promise<ToolResult> {
  try {
    const name = assertIdentifier(args.collection, "collection");
    const idColumn = assertIdentifier(args.idColumn ?? "id", "idColumn");
    const sql = `SELECT * FROM ${name} WHERE ${idColumn} = ${idLiteral(args.id)} LIMIT 1`;
    const r = await runQueryPreferStream(client, sql, { maxRows: 1 });
    const records = r.result?.records?.map((rec) => rec.values) ?? [];
    const record = records[0] ?? null;
    return ok(
      record
        ? `Found ${name}/${args.id} on ${conn.baseUrl}.`
        : `No ${name} where ${idColumn} = ${args.id} on ${conn.baseUrl}.`,
      {
        ok: true,
        found: record !== null,
        collection: name,
        id: args.id,
        record,
        baseUrl: conn.baseUrl,
        mode: conn.mode,
      }
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

// ---- Registration ---------------------------------------------------------

export interface DataToolsConfig extends ResolveConnectionOptions {
  /** Build a client for a resolved endpoint. Overridable in tests. */
  createClient?: (
    baseUrl: string,
    headers?: Record<string, string>
  ) => ReadClient;
}

const MODEL_ONLY_META = { ui: { visibility: ["model"] } } as const;

/**
 * Register the model-facing `query` / `list` / `get` data tools. They resolve a
 * connection per call (tool arg `connectionUrl`, else the configured default),
 * build a server-side RedClient, and return results as `structuredContent`.
 */
export function registerDataTools(
  server: McpServer,
  config: DataToolsConfig = {}
): void {
  const createClient =
    config.createClient ??
    ((baseUrl, headers) => new RedClient(baseUrl, { headers }));
  const resolveOpts: ResolveConnectionOptions = {
    defaultUrl: config.defaultUrl,
    authHeader: config.authHeader,
  };

  function resolve(connectionUrl?: string) {
    const conn = resolveConnection(connectionUrl, resolveOpts);
    return { conn, client: createClient(conn.baseUrl, conn.headers) };
  }

  const connectionUrlSchema = z
    .string()
    .optional()
    .describe(
      "reddb endpoint to read from (http(s):// or red://). Defaults to the MCP server's configured connection. Local file paths are not yet supported (#48)."
    );

  server.registerTool(
    "query",
    {
      title: "Query reddb",
      description:
        "Run a read-only reddb query (SELECT/WITH/SHOW/EXPLAIN/DESCRIBE/MATCH) and return rows as structured data. Write/DDL statements are refused.",
      inputSchema: {
        query: z.string().describe("A read-only reddb SQL/graph statement."),
        connectionUrl: connectionUrlSchema,
        maxRows: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum rows to collect (default 10000)."),
      },
      outputSchema: {
        ok: z.boolean(),
        error: z.string().optional(),
        query: z.string().optional(),
        columns: z.array(z.string()).optional(),
        records: z.array(z.record(z.string(), z.unknown())).optional(),
        recordCount: z.number().optional(),
        streamed: z.boolean().optional(),
        truncated: z.boolean().optional(),
        baseUrl: z.string().optional(),
        mode: z.string().optional(),
      },
      _meta: MODEL_ONLY_META,
    },
    async ({ query, connectionUrl, maxRows }) => {
      let resolved;
      try {
        resolved = resolve(connectionUrl);
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
      return runQueryTool(resolved.client, { query, maxRows }, resolved.conn);
    }
  );

  server.registerTool(
    "list",
    {
      title: "List reddb collections or rows",
      description:
        "List collection names, or — when a collection is given — the first rows of that collection. Read-only.",
      inputSchema: {
        collection: z
          .string()
          .optional()
          .describe("Collection to list rows from. Omit to list collections."),
        connectionUrl: connectionUrlSchema,
        maxRows: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Maximum rows when listing a collection (default 100)."),
      },
      outputSchema: {
        ok: z.boolean(),
        error: z.string().optional(),
        collections: z.array(z.string()).optional(),
        count: z.number().optional(),
        collection: z.string().optional(),
        columns: z.array(z.string()).optional(),
        records: z.array(z.record(z.string(), z.unknown())).optional(),
        recordCount: z.number().optional(),
        truncated: z.boolean().optional(),
        baseUrl: z.string().optional(),
        mode: z.string().optional(),
      },
      _meta: MODEL_ONLY_META,
    },
    async ({ collection, connectionUrl, maxRows }) => {
      let resolved;
      try {
        resolved = resolve(connectionUrl);
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
      return runListTool(
        resolved.client,
        { collection, maxRows },
        resolved.conn
      );
    }
  );

  server.registerTool(
    "get",
    {
      title: "Get a reddb record",
      description:
        "Fetch a single record from a collection by id. Read-only; returns the record or null.",
      inputSchema: {
        collection: z.string().describe("Collection name."),
        id: z.union([z.string(), z.number()]).describe("Record id to look up."),
        idColumn: z
          .string()
          .optional()
          .describe("Column to match the id against (default 'id')."),
        connectionUrl: connectionUrlSchema,
      },
      outputSchema: {
        ok: z.boolean(),
        error: z.string().optional(),
        found: z.boolean().optional(),
        collection: z.string().optional(),
        id: z.union([z.string(), z.number()]).optional(),
        record: z.record(z.string(), z.unknown()).nullable().optional(),
        baseUrl: z.string().optional(),
        mode: z.string().optional(),
      },
      _meta: MODEL_ONLY_META,
    },
    async ({ collection, id, idColumn, connectionUrl }) => {
      let resolved;
      try {
        resolved = resolve(connectionUrl);
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e));
      }
      return runGetTool(
        resolved.client,
        { collection, id, idColumn },
        resolved.conn
      );
    }
  );
}
