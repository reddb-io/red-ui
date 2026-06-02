#!/usr/bin/env node

import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod/v4";
import { classifyTarget } from "./target-mode.js";
import {
  type LocalServerHandle,
  resolveLocalFilePath,
  spawnLocalServer,
  stopAllLocalServers,
} from "./local-server.js";

// Single source of truth for "what version am I": the package.json version
// (changeset-managed, version-locked with @reddb-io/ui + ui-kit), overridable by
// the RED_BUILD_VERSION env the release CI sets from the git tag. From the
// compiled dist/index.js, ../package.json is the package root manifest (shipped
// because `files` always includes it). Mirrors the ../red-skills build-info
// pattern; replaces the previously hardcoded "0.1.0".
function resolveVersion(): string {
  const fromEnv = process.env.RED_BUILD_VERSION;
  if (fromEnv) return fromEnv.replace(/^v/, "");
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(
      readFileSync(join(here, "..", "package.json"), "utf8")
    ) as { version?: string };
    if (pkg.version) return pkg.version;
  } catch {
    // fall through
  }
  return "0.0.0-dev";
}

const RED_UI_MCP_VERSION = resolveVersion();

const APP_RESOURCE_URI = "ui://red-ui/app.html";
const MCP_APPS_CDN =
  "https://esm.sh/@modelcontextprotocol/ext-apps@1.7.2/app-with-deps";
const DEFAULT_APP_URL = "https://ui.reddb.io";

type RedUiView = "home" | "query" | "collections" | "cluster" | "security";

interface ServerConfig {
  appUrl: string;
  connectDomains: string[];
}

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeHttpUrl(value: string | undefined, fallback: string): string {
  const raw = value?.trim() || fallback;
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`RED_UI_APP_URL must be an http(s) URL, got ${raw}`);
  }
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function getOrigin(url: string): string {
  return new URL(url).origin;
}

function loadConfig(): ServerConfig {
  const appUrl = normalizeHttpUrl(process.env.RED_UI_APP_URL, DEFAULT_APP_URL);
  const defaultConnectDomains = [
    getOrigin(appUrl),
    "http://localhost:5055",
    "http://127.0.0.1:5055",
    "http://localhost:15055",
    "http://127.0.0.1:15055",
    "http://localhost:25055",
    "http://127.0.0.1:25055",
  ];

  return {
    appUrl,
    connectDomains: [
      ...new Set([
        ...defaultConnectDomains,
        ...parseList(process.env.RED_UI_CONNECT_DOMAINS),
      ]),
    ],
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function jsonForInlineScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function renderRedUiAppHtml(config: ServerConfig): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>red-ui</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #101214;
        color: #f5f7f8;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        background: #101214;
      }
      .shell {
        display: grid;
        grid-template-rows: auto 1fr;
        min-height: 100vh;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: #171a1d;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
      }
      .mark {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 6px;
        color: #ff5a4d;
        font-weight: 720;
      }
      .title {
        display: grid;
        gap: 1px;
        min-width: 0;
      }
      .title strong {
        font-size: 14px;
        font-weight: 680;
      }
      .title span {
        overflow: hidden;
        max-width: min(60vw, 720px);
        color: #a9b0b6;
        font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
        font-size: 11px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 0 0 auto;
      }
      button, a.button {
        appearance: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        padding: 0 10px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 6px;
        background: #22272b;
        color: #f5f7f8;
        font: inherit;
        font-size: 12px;
        text-decoration: none;
        cursor: pointer;
      }
      button:hover, a.button:hover {
        background: #2a3035;
      }
      main {
        min-height: 0;
        background: #0d0f11;
      }
      iframe {
        display: block;
        width: 100%;
        height: 100%;
        min-height: 620px;
        border: 0;
        background: white;
      }
      .empty {
        display: none;
        padding: 28px;
        color: #c7cdd2;
      }
      .empty code {
        padding: 2px 5px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }
      body[data-error="true"] iframe { display: none; }
      body[data-error="true"] .empty { display: block; }
      @media (max-width: 720px) {
        header {
          align-items: stretch;
          flex-direction: column;
        }
        .actions {
          justify-content: flex-end;
        }
        .title span {
          max-width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <header>
        <div class="brand">
          <div class="mark">r</div>
          <div class="title">
            <strong>red-ui MCP App</strong>
            <span id="target">${escapeHtml(config.appUrl)}</span>
          </div>
        </div>
        <div class="actions">
          <button id="fullscreen" type="button">Fullscreen</button>
          <button id="open" type="button">Open</button>
        </div>
      </header>
      <main>
        <iframe id="red-ui-frame" title="red-ui"></iframe>
        <section class="empty">
          <h1>red-ui is not reachable</h1>
          <p>Start the web app with <code>pnpm dev</code>, or set <code>RED_UI_APP_URL</code> before starting this MCP server.</p>
        </section>
      </main>
    </div>
    <script type="module">
      const DEFAULT_APP_URL = ${jsonForInlineScript(config.appUrl)};
      const MCP_APPS_CDN = ${jsonForInlineScript(MCP_APPS_CDN)};
      const frame = document.getElementById('red-ui-frame');
      const target = document.getElementById('target');
      const openButton = document.getElementById('open');
      const fullscreenButton = document.getElementById('fullscreen');
      const state = {
        appUrl: DEFAULT_APP_URL,
        view: 'query',
        connectionUrl: ''
      };

      let app;

      function applyPatch(patch) {
        if (!patch || typeof patch !== 'object') return;
        if (typeof patch.appUrl === 'string' && patch.appUrl) state.appUrl = patch.appUrl;
        if (typeof patch.view === 'string') state.view = patch.view;
        if (typeof patch.connectionUrl === 'string') state.connectionUrl = patch.connectionUrl;
        render();
      }

      function buildFrameUrl() {
        const url = new URL(state.appUrl || DEFAULT_APP_URL);
        url.searchParams.set('mcp', '1');
        // Open Contract pre-configuration: seed non-secret endpoint + route.
        // Never seed a token here — secrets are reserved for a later
        // postMessage channel.
        if (state.connectionUrl) url.searchParams.set('cs', state.connectionUrl);
        if (state.view) url.searchParams.set('to', '/' + state.view.replace(/^\\//, ''));
        return url.toString();
      }

      function render() {
        const nextUrl = buildFrameUrl();
        target.textContent = nextUrl;
        openButton.dataset.url = nextUrl;
        if (frame.src !== nextUrl) frame.src = nextUrl;
      }

      openButton.addEventListener('click', async () => {
        const url = openButton.dataset.url || buildFrameUrl();
        if (app?.openLink) {
          await app.openLink({ url }).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
          return;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
      });

      fullscreenButton.addEventListener('click', async () => {
        if (app?.requestDisplayMode) {
          await app.requestDisplayMode({ mode: 'fullscreen' }).catch(() => {});
        }
      });

      frame.addEventListener('error', () => {
        document.body.dataset.error = 'true';
      });

      render();

      try {
        const { App } = await import(MCP_APPS_CDN);
        app = new App(
          { name: 'red-ui', version: ${JSON.stringify(RED_UI_MCP_VERSION)} },
          {},
          { autoResize: true }
        );
        app.ontoolinput = (params) => applyPatch(params.arguments);
        app.ontoolresult = (params) => applyPatch(params.structuredContent);
        await app.connect();
      } catch (error) {
        console.warn('MCP Apps bridge unavailable; rendering red-ui with static defaults.', error);
      }
    </script>
  </body>
</html>`;
}

function createServer(config: ServerConfig): McpServer {
  const server = new McpServer({
    name: "red-ui",
    version: RED_UI_MCP_VERSION,
  });

  // One `red server` per local file (its flock is single-writer — ADR-0006).
  // Keyed by the resolved absolute path so a repeated open reuses the child.
  const localServers = new Map<string, Promise<LocalServerHandle>>();

  async function openLocalServer(target: string): Promise<LocalServerHandle> {
    const key = resolveLocalFilePath(target);
    const existing = localServers.get(key);
    if (existing) {
      try {
        const handle = await existing;
        if (
          handle.child.exitCode === null &&
          handle.child.signalCode === null
        ) {
          return handle;
        }
      } catch {
        // Previous attempt failed; fall through and respawn.
      }
    }
    const pending = spawnLocalServer({ target });
    localServers.set(key, pending);
    try {
      return await pending;
    } catch (error) {
      localServers.delete(key);
      throw error;
    }
  }

  registerAppResource(
    server,
    "red-ui app",
    APP_RESOURCE_URI,
    {
      description:
        "Interactive red-ui database workspace embedded as an MCP App.",
      _meta: {
        ui: {
          csp: {
            connectDomains: config.connectDomains,
            frameDomains: [getOrigin(config.appUrl)],
            resourceDomains: [getOrigin(config.appUrl), "https://esm.sh"],
          },
          prefersBorder: false,
        },
      },
    },
    async () => ({
      contents: [
        {
          uri: APP_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: renderRedUiAppHtml(config),
          _meta: {
            ui: {
              csp: {
                connectDomains: config.connectDomains,
                frameDomains: [getOrigin(config.appUrl)],
                resourceDomains: [getOrigin(config.appUrl), "https://esm.sh"],
              },
              prefersBorder: false,
            },
          },
        },
      ],
    })
  );

  registerAppTool(
    server,
    "open_red_ui",
    {
      title: "Open red-ui",
      description:
        "Display the red-ui database workspace as an embedded MCP App.",
      inputSchema: {
        connectionUrl: z
          .string()
          .optional()
          .describe(
            "Optional red/http connection URL to preselect in red-ui, for example http://localhost:5055."
          ),
        view: z
          .enum(["home", "query", "collections", "cluster", "security"])
          .optional()
          .describe("Initial red-ui view to display. Defaults to query."),
      },
      _meta: {
        ui: {
          resourceUri: APP_RESOURCE_URI,
          visibility: ["model", "app"],
        },
      },
    },
    async ({ connectionUrl, view }) => {
      const selectedView: RedUiView = view ?? "query";
      const mode = classifyTarget(connectionUrl);

      // Local-file targets (#48, ADR-0006): the browser Surface cannot reach a
      // filesystem path, so the MCP process spawns one `red server` that owns
      // the file, health-checks it via `/stats`, and points the UI at the
      // ephemeral `http://127.0.0.1:<port>` it exposes. The child is torn down
      // on MCP exit/disconnect.
      if (mode === "local") {
        const target = connectionUrl ?? "";
        try {
          const local = await openLocalServer(target);
          return {
            content: [
              {
                type: "text",
                text: `Serving local file ${local.filePath} via a red server at ${local.baseUrl}; opening red-ui ${selectedView} view.`,
              },
            ],
            structuredContent: {
              appUrl: config.appUrl,
              connectionUrl: local.baseUrl,
              view: selectedView,
              mode,
              localServer: {
                filePath: local.filePath,
                port: local.port,
                readOnly: local.readOnly,
              },
            },
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: "text",
                text: `Could not open the local file "${target}": ${message}`,
              },
            ],
            isError: true,
            structuredContent: {
              appUrl: config.appUrl,
              connectionUrl: "",
              view: selectedView,
              mode,
            },
          };
        }
      }

      // Remote target: hand the URL to the browser via the Open Contract; no
      // process is spawned.
      return {
        content: [
          {
            type: "text",
            text: `Opening red-ui ${selectedView} view from ${config.appUrl}.`,
          },
        ],
        structuredContent: {
          appUrl: config.appUrl,
          connectionUrl: connectionUrl ?? "",
          view: selectedView,
          mode,
        },
      };
    }
  );

  return server;
}

function printHelp() {
  process.stdout.write(`red-ui MCP server

Usage:
  ui-mcp --stdio

Environment:
  RED_UI_APP_URL             URL of the hosted or running red-ui web app. Default: ${DEFAULT_APP_URL}
  RED_UI_CONNECT_DOMAINS     Comma-separated extra connect-src domains for the embedded app.
  RED_BINARY                 Path to the reddb \`red\` binary used to serve local .rdb files.
                             Defaults to the @reddb-io/sdk binary, else \`red\` on PATH.

Example client config:
  {
    "mcpServers": {
      "red-ui": {
        "command": "npx",
        "args": ["-y", "@reddb-io/ui@latest", "mcp", "--stdio"],
        "env": { "RED_UI_APP_URL": "${DEFAULT_APP_URL}" }
      }
    }
  }
`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--help") || args.has("-h")) {
    printHelp();
    return;
  }

  if (!args.has("--stdio")) {
    throw new Error("Only --stdio transport is supported for now.");
  }

  const server = createServer(loadConfig());
  const transport = new StdioServerTransport();

  // Tear down any spawned local `red server` children when the MCP client
  // disconnects (stdin closes) — no orphan servers (ADR-0006). The process
  // exit hooks in local-server.ts are the synchronous backstop.
  const previousOnClose = transport.onclose?.bind(transport);
  transport.onclose = () => {
    previousOnClose?.();
    void stopAllLocalServers();
  };

  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack : String(error)}\n`
  );
  process.exit(1);
});
