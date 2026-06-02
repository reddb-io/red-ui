import { chmodSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(here);
const {
  resolveLocalFilePath,
  resolveRedBinary,
  spawnLocalServer,
  stopAllLocalServers,
} = await import(join(packageDir, "dist/local-server.js"));

const FAKE_RED = join(here, "fake-red.mjs");
chmodSync(FAKE_RED, 0o755);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function isUp(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/stats`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- resolveLocalFilePath: normalize fuzzy targets to an fs path -------------
assert(
  resolveLocalFilePath("file:///data/app.rdb") === "/data/app.rdb",
  "file:// should map to its path"
);
assert(
  resolveLocalFilePath("~/notes.rdb") === join(homedir(), "notes.rdb"),
  "~ should expand to home"
);
assert(
  resolveLocalFilePath("/var/lib/x.rdb") === "/var/lib/x.rdb",
  "absolute path is preserved"
);
assert(
  resolveLocalFilePath("./mydb.rdb") === resolve(process.cwd(), "mydb.rdb"),
  "relative path resolves against cwd"
);

// --- binary resolution: actionable failure when no binary exists -------------
{
  const savedPath = process.env.PATH;
  const savedBin = process.env.RED_BINARY;
  process.env.PATH = ""; // no `red` on PATH
  delete process.env.RED_BINARY; // no explicit override
  let threw = null;
  try {
    await resolveRedBinary();
  } catch (error) {
    threw = error;
  } finally {
    process.env.PATH = savedPath;
    if (savedBin !== undefined) process.env.RED_BINARY = savedBin;
  }
  assert(threw, "resolveRedBinary must throw when no binary is found");
  assert(
    /red.*binary|RED_BINARY|PATH|@reddb-io\/sdk/i.test(threw.message),
    `failure message must be actionable, got: ${threw.message}`
  );
}

// --- binary resolution: RED_BINARY override wins -----------------------------
{
  const saved = process.env.RED_BINARY;
  process.env.RED_BINARY = FAKE_RED;
  try {
    const resolved = await resolveRedBinary();
    assert(
      resolved.binaryPath === FAKE_RED && resolved.source === "env",
      "RED_BINARY override should resolve to that path with source=env"
    );
  } finally {
    if (saved === undefined) delete process.env.RED_BINARY;
    else process.env.RED_BINARY = saved;
  }
}

// --- lifecycle: spawn → health-check → teardown (no orphan) ------------------
{
  const handle = await spawnLocalServer({
    target: "/tmp/red-ui-mcp-test.rdb",
    binaryPath: FAKE_RED,
    healthTimeoutMs: 5000,
  });
  assert(
    handle.baseUrl === `http://127.0.0.1:${handle.port}`,
    "handle exposes the loopback baseUrl"
  );
  assert(
    handle.filePath === "/tmp/red-ui-mcp-test.rdb",
    "filePath is resolved"
  );
  assert(await isUp(handle.baseUrl), "server must be healthy after spawn");

  await handle.stop();
  assert(
    handle.child.exitCode !== null || handle.child.signalCode !== null,
    "child must have exited after stop()"
  );
  assert(!(await isUp(handle.baseUrl)), "server must be down after teardown");

  // stop() is idempotent.
  await handle.stop();
}

// --- lifecycle: a binary that exits before healthy rejects, leaves no child --
{
  const saved = process.env.FAKE_RED_FAIL;
  process.env.FAKE_RED_FAIL = "exit";
  let threw = null;
  let handle = null;
  try {
    handle = await spawnLocalServer({
      target: "/tmp/red-ui-mcp-bad.rdb",
      binaryPath: FAKE_RED,
      healthTimeoutMs: 5000,
    });
  } catch (error) {
    threw = error;
  } finally {
    if (saved === undefined) delete process.env.FAKE_RED_FAIL;
    else process.env.FAKE_RED_FAIL = saved;
  }
  assert(!handle, "spawnLocalServer must not resolve when the binary exits");
  assert(threw, "spawnLocalServer must reject when the binary exits");
  assert(
    /exited/i.test(threw.message),
    `error should explain the early exit, got: ${threw.message}`
  );
}

// --- stopAllLocalServers tears down every tracked child ----------------------
{
  const a = await spawnLocalServer({
    target: "/tmp/red-ui-mcp-a.rdb",
    binaryPath: FAKE_RED,
  });
  const b = await spawnLocalServer({
    target: "/tmp/red-ui-mcp-b.rdb",
    binaryPath: FAKE_RED,
  });
  assert(await isUp(a.baseUrl), "server a healthy");
  assert(await isUp(b.baseUrl), "server b healthy");
  await stopAllLocalServers();
  assert(!(await isUp(a.baseUrl)), "server a down after stopAll");
  assert(!(await isUp(b.baseUrl)), "server b down after stopAll");
}

console.log("local-server lifecycle test passed");
