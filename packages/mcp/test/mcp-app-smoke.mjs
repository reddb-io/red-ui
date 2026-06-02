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
} finally {
  await client.close();
}

console.log("red-ui MCP App smoke test passed");
