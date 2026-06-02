import assert from "node:assert/strict";
import { test } from "node:test";

import { classifyTarget } from "../dist/target.js";
import { handleLocalTarget } from "../dist/local.js";

test("http(s):// URLs are remote and pass through the Open Contract", () => {
  for (const url of [
    "http://localhost:5055",
    "https://cluster.example.com",
    "https://cluster.example.com:9443/path",
  ]) {
    const t = classifyTarget(url);
    assert.equal(t.mode, "remote");
    assert.equal(t.raw, url);
    assert.ok(t.connectionString.length > 0);
  }
});

test("http(s):// connection strings drop the root trailing slash", () => {
  assert.equal(
    classifyTarget("http://localhost:5055").connectionString,
    "http://localhost:5055"
  );
  assert.equal(
    classifyTarget("https://cluster.example.com").connectionString,
    "https://cluster.example.com"
  );
});

test("red:// URLs are remote and preserved verbatim", () => {
  assert.deepEqual(classifyTarget("red://localhost"), {
    mode: "remote",
    connectionString: "red://localhost",
    raw: "red://localhost",
  });
  assert.equal(
    classifyTarget("red://localhost:5050").connectionString,
    "red://localhost:5050"
  );
});

test("bare host:port is remote and normalized to an http URL", () => {
  assert.equal(classifyTarget("localhost:5055").mode, "remote");
  assert.equal(
    classifyTarget("localhost:5055").connectionString,
    "http://localhost:5055"
  );
  assert.equal(
    classifyTarget("10.0.0.2:5050").connectionString,
    "http://10.0.0.2:5050"
  );
});

test("credentials never survive into the connection string (ADR-0005)", () => {
  assert.equal(
    classifyTarget("https://user:secrettoken@cluster.example.com")
      .connectionString,
    "https://cluster.example.com"
  );
  assert.equal(
    classifyTarget("red://u:p@host:5050").connectionString,
    "red://host:5050"
  );
  for (const cs of [
    classifyTarget("https://user:secrettoken@cluster.example.com")
      .connectionString,
    classifyTarget("red://u:p@host:5050").connectionString,
  ]) {
    assert.ok(!cs.includes("secrettoken"));
    assert.ok(!cs.includes("@"));
  }
});

test("*.rdb targets are local", () => {
  for (const path of ["data.rdb", "memory.RDB", "snapshot.rdb"]) {
    const t = classifyTarget(path);
    assert.equal(t.mode, "local");
    assert.equal(t.path, path);
  }
});

test("filesystem paths are local", () => {
  for (const path of [
    "/var/lib/reddb/data.rdb",
    "./local.rdb",
    "../sibling/db",
    "~/reddb/store",
    "some/nested/dir",
  ]) {
    assert.equal(classifyTarget(path).mode, "local", `expected local: ${path}`);
  }
});

test("file:// URLs are local and decoded to a path", () => {
  const t = classifyTarget("file:///var/lib/reddb/data.rdb");
  assert.equal(t.mode, "local");
  assert.equal(t.path, "/var/lib/reddb/data.rdb");
});

test("Windows drive paths are local, not a 1-char URL scheme", () => {
  assert.equal(classifyTarget("C:\\reddb\\data.rdb").mode, "local");
  assert.equal(classifyTarget("C:/reddb/data.rdb").mode, "local");
});

test("a bare hostless token falls back to local", () => {
  assert.equal(classifyTarget("mydb").mode, "local");
});

test("input is trimmed and emptiness is rejected", () => {
  assert.equal(
    classifyTarget("  red://localhost  ").connectionString,
    "red://localhost"
  );
  assert.throws(() => classifyTarget(""), /empty/i);
  assert.throws(() => classifyTarget("   "), /empty/i);
});

test("unsupported schemes are rejected", () => {
  assert.throws(
    () => classifyTarget("ftp://host/file"),
    /Unsupported target scheme/
  );
  assert.throws(
    () => classifyTarget("redis://host:6379"),
    /Unsupported target scheme/
  );
});

test("remote URLs without a host are rejected", () => {
  assert.throws(() => classifyTarget("http://"), /malformed|host/i);
});

test("the local handler seam never spawns and seeds no connection string", () => {
  const result = handleLocalTarget(classifyTarget("/var/lib/reddb/data.rdb"));
  assert.equal(result.spawned, false);
  assert.equal(result.connectionString, null);
  assert.match(result.message, /not available yet|not yet/i);
  assert.match(result.message, /\/var\/lib\/reddb\/data\.rdb/);
});
