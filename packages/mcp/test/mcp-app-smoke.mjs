import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));

const client = new Client({ name: "red-ui-mcp-app-smoke", version: "0.0.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(packageDir, "dist/index.js"), "--stdio"],
  env: {
    ...process.env,
    RED_UI_APP_URL: "https://ui.reddb.io",
  },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

await client.connect(transport);

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

  // Remote target: a URL-shaped `target` is detected as remote and seeds ?cs=.
  const remote = await client.callTool({
    name: "open_red_ui",
    arguments: {
      target: "https://user:tok@cluster.example.com",
      view: "cluster",
    },
  });
  assert(
    remote.structuredContent?.connectionUrl === "https://cluster.example.com",
    `remote target must seed a sanitized connection string, got ${remote.structuredContent?.connectionUrl}`
  );
  assert(
    !JSON.stringify(remote).includes("tok"),
    "no secret/token may appear anywhere in the remote result (ADR-0005)"
  );

  // Local target: a *.rdb path is detected as local, routed to the seam, and
  // never seeds a connection string (no process spawned, no ?cs=).
  const local = await client.callTool({
    name: "open_red_ui",
    arguments: { target: "/var/lib/reddb/data.rdb", view: "query" },
  });
  assert(
    local.structuredContent?.connectionUrl === "",
    "local target must not seed a connection string"
  );
  const localText = local.content?.find((c) => c.type === "text")?.text ?? "";
  assert(
    /local/i.test(localText),
    `local target must report a local-file message, got ${localText}`
  );

  // Unsupported scheme: classified as an error, no connection seeded.
  const bad = await client.callTool({
    name: "open_red_ui",
    arguments: { target: "redis://host:6379" },
  });
  assert(
    bad.isError === true,
    "unsupported scheme must surface as a tool error"
  );
  assert(
    bad.structuredContent?.connectionUrl === "",
    "errored target must not seed a connection string"
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
} finally {
  await client.close();
}

console.log("red-ui MCP App smoke test passed");
