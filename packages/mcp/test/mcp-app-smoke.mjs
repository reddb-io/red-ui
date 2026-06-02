import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = dirname(here);

// Point the server at the fake `red` binary so the local-file path spawns a
// stand-in HTTP server instead of needing a real reddb build.
const fakeRed = join(here, "fake-red.mjs");
chmodSync(fakeRed, 0o755);

// Stand-in embeddable bundle so local mode can serve the UI over http://localhost
// (#51) without building the full @reddb-io/ui bundle in this test.
const embedDir = mkdtempSync(join(tmpdir(), "red-ui-embed-smoke-"));
writeFileSync(
  join(embedDir, "index.js"),
  "export const mountRedUi = () => {};\nexport class RedClient {}\nexport class InjectedClientProvider {}\n"
);

const client = new Client({ name: "red-ui-mcp-app-smoke", version: "0.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageDir, "dist/index.js"), "--stdio"],
  env: {
    ...process.env,
    RED_UI_APP_URL: "https://ui.reddb.io",
    RED_BINARY: fakeRed,
    RED_UI_EMBED_DIR: embedDir,
  },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function statsUp(baseUrl) {
  try {
    const res = await fetch(`${baseUrl}/stats`, {
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

await client.connect(transport);

let localBaseUrl = null;
let uiBaseUrl = null;

try {
  const tools = await client.listTools();
  const openTool = tools.tools.find((tool) => tool.name === "open_red_ui");

  assert(openTool, "open_red_ui tool was not registered");
  assert(
    openTool._meta?.ui?.resourceUri === "ui://red-ui/app.html",
    `open_red_ui must point at the MCP App resource, got ${JSON.stringify(openTool._meta)}`
  );

  // Server-side data tools (#49) are registered as model-facing tools.
  for (const name of ["query", "list", "get"]) {
    const dataTool = tools.tools.find((tool) => tool.name === name);
    assert(dataTool, `${name} data tool was not registered`);
    assert(
      dataTool.outputSchema,
      `${name} must declare an outputSchema for structuredContent`
    );
  }

  // With no configured connection, a data tool reports the missing-connection
  // error rather than crashing — and leaks no token.
  const noConn = await client.callTool({ name: "list", arguments: {} });
  assert(noConn.isError === true, "list with no connection must be an error");
  assert(
    noConn.structuredContent?.ok === false,
    "list error must carry structuredContent { ok: false }"
  );

  const result = await client.callTool({
    name: "open_red_ui",
    arguments: { connectionUrl: "red://localhost", view: "query" },
  });

  assert(
    result.structuredContent?.appUrl === "https://ui.reddb.io",
    "tool result must include hosted appUrl"
  );
  assert(
    result.structuredContent?.connectionUrl === "red://localhost",
    "tool result must preserve connectionUrl"
  );
  assert(
    result.structuredContent?.view === "query",
    "tool result must preserve selected view"
  );

  const resource = await client.readResource({ uri: "ui://red-ui/app.html" });
  const content = resource.contents?.[0];

  assert(
    content?.mimeType === "text/html;profile=mcp-app",
    `invalid MCP App MIME type: ${content?.mimeType}`
  );
  assert(
    typeof content.text === "string" && content.text.includes("new App("),
    "resource must load MCP Apps bridge"
  );
  assert(
    content.text.includes("https://ui.reddb.io"),
    "resource must embed the configured hosted app URL"
  );
  assert(
    !content.text.includes("url.pathname"),
    "resource must not rewrite the hosted app pathname"
  );

  // Local-file target: the MCP must spawn a red server, health-check it, and
  // hand the UI an http://127.0.0.1:<port> connection string (#48, ADR-0006).
  const local = await client.callTool({
    name: "open_red_ui",
    arguments: {
      connectionUrl: "/tmp/red-ui-mcp-smoke.rdb",
      view: "collections",
    },
  });
  assert(
    local.structuredContent?.mode === "local",
    "local target must classify as local"
  );
  const localCs = local.structuredContent?.connectionUrl;
  assert(
    typeof localCs === "string" && /^http:\/\/127\.0\.0\.1:\d+$/.test(localCs),
    `local target must seed a loopback connection string, got ${localCs}`
  );
  assert(
    local.structuredContent?.localServer?.filePath ===
      "/tmp/red-ui-mcp-smoke.rdb",
    "local result must report the served file path"
  );
  assert(
    await statsUp(localCs),
    "spawned local server must be healthy before the UI is pointed at it"
  );
  localBaseUrl = localCs;

  // #51, ADR-0006: in local mode the UI must load from http://localhost — not
  // the hosted HTTPS origin — so the iframe and the local API share an http
  // scheme (no Firefox/Safari mixed-content block) and work offline.
  const uiUrl = local.structuredContent?.appUrl;
  assert(
    typeof uiUrl === "string" && /^http:\/\/127\.0\.0\.1:\d+$/.test(uiUrl),
    `local mode must serve the UI from http://localhost, got ${uiUrl}`
  );
  assert(
    uiUrl !== "https://ui.reddb.io",
    "local mode must not load the UI from the hosted HTTPS origin"
  );
  uiBaseUrl = uiUrl;

  const hostPage = await fetch(`${uiUrl}/`);
  assert(hostPage.ok, "local UI host page must be reachable");
  const hostHtml = await hostPage.text();
  assert(
    hostHtml.includes("./embed/index.js"),
    "host page must import the embeddable bundle same-origin"
  );
  const bundle = await fetch(`${uiUrl}/embed/index.js`);
  assert(bundle.ok, "embeddable bundle must be served under /embed/");
} finally {
  await client.close();
  rmSync(embedDir, { recursive: true, force: true });
}

// On disconnect the spawned child must be gone — no orphan servers.
if (localBaseUrl) {
  let down = false;
  for (let i = 0; i < 40; i++) {
    if (!(await statsUp(localBaseUrl))) {
      down = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(down, "spawned local server must be torn down after MCP disconnect");
}

// The local UI server must also be torn down — no orphan static servers.
if (uiBaseUrl) {
  let down = false;
  for (let i = 0; i < 40; i++) {
    try {
      await fetch(`${uiBaseUrl}/`, { signal: AbortSignal.timeout(500) });
    } catch {
      down = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(down, "local UI server must be torn down after MCP disconnect");
}

console.log("red-ui MCP App smoke test passed");
