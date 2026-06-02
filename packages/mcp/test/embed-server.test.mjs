import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(here);
const {
  resolveEmbedDir,
  startEmbedServer,
  renderHostHtml,
  stopAllEmbedServers,
} = await import(join(packageDir, "dist/embed-server.js"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// A stand-in embed bundle dir — just enough files to exercise serving without
// building the full @reddb-io/ui bundle.
const embedDir = mkdtempSync(join(tmpdir(), "red-ui-embed-"));
writeFileSync(
  join(embedDir, "index.js"),
  'export { mountRedUi, RedClient, InjectedClientProvider } from "./chunk.js";\n'
);
writeFileSync(
  join(embedDir, "chunk.js"),
  "export const mountRedUi = () => {};\n"
);
writeFileSync(join(embedDir, "ui.css"), ".x{color:red}\n");

// --- renderHostHtml: imports the bundle same-origin and wires `cs`/`to` ------
{
  const html = renderHostHtml();
  assert(html.includes("./embed/index.js"), "host page must import the bundle");
  assert(html.includes("mountRedUi"), "host page must mount red-ui");
  assert(
    html.includes("InjectedClientProvider"),
    "host page must build an injected provider"
  );
  assert(
    html.includes('params.get("cs")') && html.includes('params.get("to")'),
    "host page must read cs/to from the query string"
  );
}

// --- resolveEmbedDir: explicit override that holds index.js wins -------------
{
  const resolved = resolveEmbedDir(embedDir);
  assert(
    resolved === embedDir,
    `explicit embedDir should win, got ${resolved}`
  );
}

// --- resolveEmbedDir: an override without index.js falls through -------------
{
  const empty = mkdtempSync(join(tmpdir(), "red-ui-embed-empty-"));
  try {
    // No index.js here → it must fall through to a later candidate (the
    // monorepo sibling packages/ui/dist/embed) rather than returning `empty`.
    let resolved = null;
    try {
      resolved = resolveEmbedDir(empty);
    } catch {
      // No real bundle built in this environment — acceptable; the point is it
      // did NOT return the empty override.
    }
    assert(
      resolved !== empty,
      "an override without index.js must not be returned"
    );
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
}

// --- startEmbedServer: serves the host page and the bundle, guards traversal -
let handle = null;
try {
  handle = await startEmbedServer({ embedDir });
  assert(
    /^http:\/\/127\.0\.0\.1:\d+$/.test(handle.baseUrl),
    `embed server must bind loopback, got ${handle.baseUrl}`
  );

  const root = await fetch(`${handle.baseUrl}/`);
  assert(root.ok, "GET / must be 200");
  assert(
    (root.headers.get("content-type") || "").includes("text/html"),
    "GET / must be served as HTML"
  );
  const rootBody = await root.text();
  assert(rootBody.includes("./embed/index.js"), "host page imports the bundle");

  const bundle = await fetch(`${handle.baseUrl}/embed/index.js`);
  assert(bundle.ok, "GET /embed/index.js must be 200");
  assert(
    (bundle.headers.get("content-type") || "").includes("text/javascript"),
    "bundle must be served as javascript"
  );
  assert(
    (await bundle.text()).includes("mountRedUi"),
    "bundle body must be the served file"
  );

  const chunk = await fetch(`${handle.baseUrl}/embed/chunk.js`);
  assert(chunk.ok, "GET /embed/chunk.js (a relative import) must be 200");

  // Path traversal must not escape the embed dir. `fetch` normalizes a literal
  // `..`, so probe with an encoded sequence that reaches the server intact.
  const rawEscape = await fetch(
    `${handle.baseUrl}/embed/%2e%2e%2f%2e%2e%2fpackage.json`
  );
  assert(rawEscape.status === 404, "encoded traversal must 404");

  const missing = await fetch(`${handle.baseUrl}/embed/nope.js`);
  assert(missing.status === 404, "missing bundle file must 404");

  const offRoute = await fetch(`${handle.baseUrl}/whatever`);
  assert(offRoute.status === 404, "non-embed, non-root path must 404");
} finally {
  if (handle) await handle.stop();
}

// --- stop(): server is down afterwards ---------------------------------------
{
  let reachable = true;
  try {
    await fetch(`${handle.baseUrl}/`, { signal: AbortSignal.timeout(500) });
  } catch {
    reachable = false;
  }
  assert(!reachable, "embed server must be down after stop()");
}

// --- stopAllEmbedServers tears down a tracked server -------------------------
{
  const a = await startEmbedServer({ embedDir });
  const ok = await fetch(`${a.baseUrl}/`);
  assert(ok.ok, "server up before stopAll");
  await stopAllEmbedServers();
  let down = false;
  try {
    await fetch(`${a.baseUrl}/`, { signal: AbortSignal.timeout(500) });
  } catch {
    down = true;
  }
  assert(down, "server down after stopAllEmbedServers");
}

rmSync(embedDir, { recursive: true, force: true });

console.log("embed-server test passed");
