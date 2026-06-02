import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));
const { RedClient } = await import(join(packageDir, "dist/red-client.js"));
const { runQueryTool, runListTool, runGetTool, isReadOnlyQuery, leadingVerb } =
  await import(join(packageDir, "dist/data-tools.js"));
const { resolveConnection } = await import(
  join(packageDir, "dist/connection.js")
);

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  }
}

// A mock reddb at the fetch boundary: a genuine round-trip exercises the real
// RedClient parsing + the real tool handler shaping against canned responses.
// `seenAuth` captures the Authorization header so we can prove it is sent to the
// server but never leaks into tool output.
function mockFetch(routes) {
  const seenAuth = [];
  const fetcher = async (url, init = {}) => {
    const u = String(url);
    const method = init.method ?? "GET";
    const headers = new Headers(init.headers);
    seenAuth.push(headers.get("authorization"));
    for (const r of routes) {
      if (r.method === method && u.endsWith(r.path)) {
        return new Response(JSON.stringify(r.body), {
          status: r.status ?? 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    }
    return new Response(
      JSON.stringify({ ok: false, error: "route not found" }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }
    );
  };
  fetcher.seenAuth = seenAuth;
  return fetcher;
}

const conn = { baseUrl: "http://reddb.test", mode: "remote" };

function clientFor(routes, headers) {
  const fetcher = mockFetch(routes);
  const client = new RedClient("http://reddb.test", {
    fetch: fetcher,
    headers,
  });
  return { client, fetcher };
}

// ---- read-only guard ----------------------------------------------------
assert(isReadOnlyQuery("SELECT * FROM t"), "SELECT is read-only");
assert(
  isReadOnlyQuery("  with x as (select 1) select * from x"),
  "WITH is read-only"
);
assert(isReadOnlyQuery("-- a comment\nSELECT 1"), "leading comment stripped");
assert(!isReadOnlyQuery("INSERT INTO t VALUES (1)"), "INSERT refused");
assert(!isReadOnlyQuery("DROP TABLE t"), "DROP refused");
assert(!isReadOnlyQuery("DELETE FROM t"), "DELETE refused");
assert(
  leadingVerb("/* c */ EXPLAIN SELECT 1") === "explain",
  "block comment stripped"
);

// ---- query tool: streams a SELECT, falls back, shapes structuredContent --
{
  // /query/stream is absent (404) → falls back to buffered /query.
  const { client } = clientFor([
    {
      method: "POST",
      path: "/query",
      body: {
        ok: true,
        query: "SELECT * FROM users",
        record_count: 2,
        result: {
          columns: ["id", "name"],
          records: [
            { values: { id: 1, name: "ada" } },
            { values: { id: 2, name: "alan" } },
          ],
        },
      },
    },
  ]);
  const res = await runQueryTool(
    client,
    { query: "SELECT * FROM users" },
    conn
  );
  assert(!res.isError, "query tool ok");
  assert(res.structuredContent.recordCount === 2, "query recordCount");
  assert(
    JSON.stringify(res.structuredContent.records) ===
      JSON.stringify([
        { id: 1, name: "ada" },
        { id: 2, name: "alan" },
      ]),
    "query records shaped as value objects"
  );
  assert(
    res.structuredContent.baseUrl === "http://reddb.test",
    "query baseUrl present"
  );
}

// ---- query tool: refuses a write statement (read-shaped only) -----------
{
  const { client, fetcher } = clientFor([]);
  const res = await runQueryTool(client, { query: "DELETE FROM users" }, conn);
  assert(res.isError === true, "write query is an error");
  assert(
    /not a read statement/.test(res.structuredContent.error),
    "write refusal message"
  );
  assert(fetcher.seenAuth.length === 0, "refused query never hit the network");
}

// ---- list tool: no collection → collection names ------------------------
{
  const { client } = clientFor([
    {
      method: "GET",
      path: "/collections",
      body: { collections: ["users", "orders"] },
    },
  ]);
  const res = await runListTool(client, {}, conn);
  assert(!res.isError, "list collections ok");
  assert(
    JSON.stringify(res.structuredContent.collections) ===
      JSON.stringify(["users", "orders"]),
    "list returns collection names"
  );
  assert(res.structuredContent.count === 2, "list count");
}

// ---- list tool: with collection → rows via SELECT -----------------------
{
  const { client } = clientFor([
    {
      method: "POST",
      path: "/query",
      body: {
        ok: true,
        query: "SELECT * FROM users LIMIT 100",
        record_count: 1,
        result: { columns: ["id"], records: [{ values: { id: 7 } }] },
      },
    },
  ]);
  const res = await runListTool(client, { collection: "users" }, conn);
  assert(!res.isError, "list rows ok");
  assert(
    res.structuredContent.collection === "users",
    "list echoes collection"
  );
  assert(res.structuredContent.recordCount === 1, "list rows count");
}

// ---- list tool: rejects a non-identifier collection (injection guard) ---
{
  const { client, fetcher } = clientFor([]);
  const res = await runListTool(
    client,
    { collection: "users; DROP TABLE x" },
    conn
  );
  assert(res.isError === true, "bad collection name refused");
  assert(fetcher.seenAuth.length === 0, "bad identifier never hit the network");
}

// ---- get tool: single record by id --------------------------------------
{
  const { client } = clientFor([
    {
      method: "POST",
      path: "/query",
      body: {
        ok: true,
        query: "SELECT * FROM users WHERE id = 7 LIMIT 1",
        record_count: 1,
        result: {
          columns: ["id", "name"],
          records: [{ values: { id: 7, name: "grace" } }],
        },
      },
    },
  ]);
  const res = await runGetTool(client, { collection: "users", id: 7 }, conn);
  assert(!res.isError, "get ok");
  assert(res.structuredContent.found === true, "get found");
  assert(res.structuredContent.record.name === "grace", "get record value");
}

// ---- get tool: not found → record null ----------------------------------
{
  const { client } = clientFor([
    {
      method: "POST",
      path: "/query",
      body: {
        ok: true,
        query: "x",
        record_count: 0,
        result: { columns: [], records: [] },
      },
    },
  ]);
  const res = await runGetTool(
    client,
    { collection: "users", id: "missing" },
    conn
  );
  assert(!res.isError, "get-missing ok");
  assert(res.structuredContent.found === false, "get-missing not found");
  assert(res.structuredContent.record === null, "get-missing record null");
}

// ---- secret hygiene: auth header is sent to the server, never returned --
{
  const { client, fetcher } = clientFor(
    [
      {
        method: "POST",
        path: "/query",
        body: {
          ok: true,
          query: "x",
          record_count: 0,
          result: { columns: [], records: [] },
        },
      },
    ],
    { Authorization: "Bearer s3cr3t-token" }
  );
  const res = await runQueryTool(client, { query: "SELECT 1" }, conn);
  assert(
    fetcher.seenAuth.includes("Bearer s3cr3t-token"),
    "auth header reaches the server"
  );
  const serialized = JSON.stringify(res);
  assert(
    !serialized.includes("s3cr3t-token"),
    "token never appears in tool output"
  );
}

// ---- connection resolver: local file is refused (#48 not implemented) ---
{
  let threw = false;
  try {
    resolveConnection("/var/lib/reddb/data.rdb");
  } catch (e) {
    threw = true;
    assert(/#48/.test(e.message), "local-file error references #48");
  }
  assert(threw, "local file target throws");

  const r = resolveConnection("red://localhost:5055");
  assert(r.baseUrl === "http://localhost:5055", "red:// normalised to http://");
  assert(r.mode === "remote", "red:// is remote");

  let threwEmpty = false;
  try {
    resolveConnection(undefined);
  } catch {
    threwEmpty = true;
  }
  assert(threwEmpty, "absent target with no default throws");
}

if (failures > 0) {
  console.error(`data-tools test FAILED (${failures} assertion(s))`);
  process.exit(1);
}
console.log("data-tools test passed");
