// Same-origin local UI for the MCP App (#51, ADR-0006).
//
// In local-file mode the API is a spawned `red server` on `http://127.0.0.1:<port>`
// (see local-server.ts). If the visual UI is still loaded from the hosted HTTPS
// origin (https://ui.reddb.io), the browser sees an HTTPS page fetching an
// `http://localhost` API — mixed content. Chrome exempts localhost, but Firefox
// and Safari are unreliable, and it requires the network anyway.
//
// So for local mode we serve the Embeddable Lib bundle (#37, shipped in
// `@reddb-io/ui/dist/embed`) ourselves over `http://127.0.0.1:<port>`. The iframe
// then loads from `http://localhost` and fetches the `http://localhost` API:
// same scheme, no mixed content, fully offline. The embed bundle owns auth via
// an InjectedClientProvider seeded from the `?cs=` connection string.
//
// One embed server per MCP process (the bundle is identical regardless of which
// file is open); torn down on MCP exit/disconnect — no orphan servers.

import {
  type IncomingMessage,
  type ServerResponse,
  createServer,
} from "node:http";
import type { Server } from "node:http";
import {
  accessSync,
  constants as fsConstants,
  createReadStream,
} from "node:fs";
import { createServer as createNetServer } from "node:net";
import { createRequire } from "node:module";
import {
  dirname,
  extname,
  isAbsolute,
  join,
  normalize,
  relative,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

export interface EmbedServerHandle {
  baseUrl: string;
  port: number;
  /** Absolute path of the served embed bundle directory. */
  embedDir: string;
  server: Server;
  /** Idempotent teardown; resolves once the HTTP server has closed. */
  stop(): Promise<void>;
}

export interface StartEmbedServerOptions {
  /** Override the embed bundle directory (tests, explicit config). */
  embedDir?: string;
  /** Override the ephemeral port (tests). */
  port?: number;
}

function isFile(file: string): boolean {
  try {
    accessSync(file, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Locate the built Embeddable Lib bundle directory (`@reddb-io/ui/dist/embed`),
 * the one containing `index.js`. Resolution order: explicit `RED_UI_EMBED_DIR`
 * → the published `@reddb-io/ui/embed` export → the monorepo sibling
 * (`packages/ui/dist/embed`) → the published dependency layout (the MCP lives in
 * `<ui>/node_modules/@reddb-io/ui-mcp`). Throws an actionable error when none of
 * these holds the bundle.
 */
export function resolveEmbedDir(override?: string): string {
  const candidates: string[] = [];

  const fromArg = override?.trim() || process.env.RED_UI_EMBED_DIR?.trim();
  if (fromArg) candidates.push(resolve(fromArg));

  // `@reddb-io/ui` exports `./embed` → `<ui>/dist/embed/index.js`.
  try {
    candidates.push(dirname(require.resolve("@reddb-io/ui/embed")));
  } catch {
    // Not resolvable from here (e.g. the monorepo, where ui depends on the MCP
    // and not the reverse). Fall through to path-based strategies.
  }

  // Monorepo dev/test: packages/mcp/dist/embed-server.js → packages/ui/dist/embed.
  candidates.push(resolve(here, "..", "..", "ui", "dist", "embed"));
  // Published layout: <ui>/node_modules/@reddb-io/ui-mcp/dist → <ui>/dist/embed.
  candidates.push(resolve(here, "..", "..", "..", "..", "dist", "embed"));

  for (const dir of candidates) {
    if (isFile(join(dir, "index.js"))) return dir;
  }

  throw new Error(
    "Cannot serve the local UI: the red-ui embeddable bundle was not found. " +
      "Build it with `pnpm --filter @reddb-io/ui build`, install a published " +
      "@reddb-io/ui, or set RED_UI_EMBED_DIR to the directory holding the " +
      "embed `index.js`. See ADR-0006 / issue #51."
  );
}

/** Reserve a free TCP port on the loopback interface, then release it. */
function pickEphemeralPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const srv = createNetServer();
    srv.unref();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = addr && typeof addr === "object" ? addr.port : 0;
      srv.close(() => {
        if (port) resolvePort(port);
        else reject(new Error("Could not reserve an ephemeral port."));
      });
    });
  });
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function contentType(filePath: string): string {
  return CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream";
}

/**
 * The host page. It imports the embed bundle from the same origin, builds a
 * single-connection InjectedClientProvider from the `?cs=` endpoint the MCP
 * seeded (the spawned `red server`), and mounts red-ui into a full-document
 * host element. `?to=` selects the initial route. No secret rides the URL
 * (ADR-0005); the local server is loopback-only and unauthenticated.
 */
export function renderHostHtml(): string {
  return `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>red-ui (local)</title>
    <style>
      html, body { margin: 0; height: 100%; background: #050607; color: #f7f8fa; }
      #red-ui-host { display: block; min-height: 100vh; }
      .boot-error {
        padding: 24px;
        font: 13px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #ff5470;
      }
    </style>
  </head>
  <body>
    <div id="red-ui-host"></div>
    <script type="module">
      import {
        RedClient,
        InjectedClientProvider,
        mountRedUi,
      } from "./embed/index.js";

      const host = document.getElementById("red-ui-host");
      const params = new URLSearchParams(location.search);
      const cs = (params.get("cs") || "").trim();
      const to = (params.get("to") || "/query").trim();

      if (!cs) {
        host.className = "boot-error";
        host.textContent =
          "No connection string (cs) was provided to the local red-ui host.";
      } else {
        const client = new RedClient(cs);
        const provider = new InjectedClientProvider({
          client,
          connection: {
            id: "host",
            url: cs,
            label: "Local file",
            role: "primary",
            description: "Served by a local red server (ADR-0006).",
          },
        });
        mountRedUi(host, {
          connectionProvider: provider,
          initialRoute: to,
          theme: "dark",
        }).catch((error) => {
          host.className = "boot-error";
          host.textContent =
            "Failed to mount red-ui: " +
            (error && error.message ? error.message : String(error));
        });
      }
    </script>
  </body>
</html>`;
}

function sendText(
  res: ServerResponse,
  status: number,
  type: string,
  body: string
): void {
  res.writeHead(status, { "content-type": type });
  res.end(body);
}

function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  embedDir: string,
  host: string,
  port: number
): void {
  let pathname: string;
  try {
    pathname = decodeURIComponent(
      new URL(req.url ?? "/", `http://${host}:${port}`).pathname
    );
  } catch {
    sendText(res, 400, "text/plain; charset=utf-8", "Bad request");
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    sendText(res, 200, "text/html; charset=utf-8", renderHostHtml());
    return;
  }

  // Everything else must resolve to a file under `<embedDir>` and be reached via
  // the `/embed/` prefix (matching the host page's `./embed/index.js` imports).
  const EMBED_PREFIX = "/embed/";
  if (!pathname.startsWith(EMBED_PREFIX)) {
    sendText(res, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  const requestedRel = pathname.slice(EMBED_PREFIX.length);
  const candidate = resolve(
    embedDir,
    normalize(requestedRel).replace(/^(\.\.(\/|\\|$))+/, "")
  );
  const rel = relative(embedDir, candidate);
  const insideEmbed = rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  if (!insideEmbed || !isFile(candidate)) {
    sendText(res, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  res.writeHead(200, { "content-type": contentType(candidate) });
  const stream = createReadStream(candidate);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  stream.pipe(res);
}

/**
 * Start one loopback HTTP server that serves the host page at `/` and the embed
 * bundle under `/embed/`. The returned handle's `stop()` closes it.
 */
export async function startEmbedServer(
  options: StartEmbedServerOptions = {}
): Promise<EmbedServerHandle> {
  const embedDir = resolveEmbedDir(options.embedDir);
  const host = "127.0.0.1";
  const port = options.port ?? (await pickEphemeralPort());
  const baseUrl = `http://${host}:${port}`;

  const server = createServer((req, res) =>
    handleRequest(req, res, embedDir, host, port)
  );

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.removeListener("error", reject);
      resolveListen();
    });
  });

  const handle: EmbedServerHandle = {
    baseUrl,
    port,
    embedDir,
    server,
    stop: makeStop(server),
  };

  trackServer(handle);
  return handle;
}

function makeStop(server: Server): () => Promise<void> {
  let stopping: Promise<void> | null = null;
  return () => {
    if (stopping) return stopping;
    stopping = new Promise<void>((resolveStop) => {
      server.close(() => resolveStop());
      // Drop keep-alive sockets so close() can complete promptly.
      server.closeAllConnections?.();
    });
    return stopping;
  };
}

// --- lifecycle registry: no orphan UI servers on MCP exit/disconnect ---------

const liveServers = new Set<EmbedServerHandle>();
let exitHooksInstalled = false;

function installExitHooks(): void {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;

  process.on("exit", () => {
    for (const handle of liveServers) {
      try {
        handle.server.close();
      } catch {
        // already gone
      }
    }
  });
}

function trackServer(handle: EmbedServerHandle): void {
  installExitHooks();
  liveServers.add(handle);
  handle.server.once("close", () => liveServers.delete(handle));
}

/** Stop every tracked embed server (MCP transport close / shutdown). */
export async function stopAllEmbedServers(): Promise<void> {
  const handles = [...liveServers];
  await Promise.all(handles.map((h) => h.stop()));
}
