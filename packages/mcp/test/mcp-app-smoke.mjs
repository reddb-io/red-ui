import { chmodSync } from "node:fs";
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

const client = new Client({ name: "red-ui-mcp-app-smoke", version: "0.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageDir, "dist/index.js"), "--stdio"],
  env: {
    ...process.env,
    RED_UI_APP_URL: "https://ui.reddb.io",
    RED_BINARY: fakeRed,
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

try {
  const tools = await client.listTools();
  const openTool = tools.tools.find((tool) => tool.name === "open_red_ui");

  assert(openTool, "open_red_ui tool was not registered");
  assert(
    openTool._meta?.ui?.resourceUri === "ui://red-ui/app.html",
    `open_red_ui must point at the MCP App resource, got ${JSON.stringify(openTool._meta)}`
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
} finally {
  await client.close();
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

console.log("red-ui MCP App smoke test passed");
