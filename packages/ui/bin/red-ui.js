#!/usr/bin/env node

import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { access } from "node:fs/promises";
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
import { spawn } from "node:child_process";

const DEFAULT_APP_URL = "https://ui.reddb.io";
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 1420;

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, "..");
const buildDir = resolve(packageRoot, "build");
const require = createRequire(import.meta.url);

function printHelp() {
  process.stdout.write(`red-ui

Usage:
  red-ui serve [connectionUrl] [--host 127.0.0.1] [--port 1420] [--open]
  red-ui open [connectionUrl] [--app-url https://ui.reddb.io]
  red-ui mcp [--stdio] [--app-url https://ui.reddb.io]

Examples:
  npx @reddb-io/ui serve --open red://localhost
  npx @reddb-io/ui open red://localhost
  npx @reddb-io/ui mcp --stdio
`);
}

function readOption(args, name, fallback) {
  const prefix = `${name}=`;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === name) return args[i + 1] ?? fallback;
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  }
  return fallback;
}

function hasFlag(args, name) {
  return args.includes(name);
}

function positional(args) {
  const values = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      if (!arg.includes("=") && args[i + 1] && !args[i + 1].startsWith("--"))
        i += 1;
      continue;
    }
    values.push(arg);
  }
  return values;
}

function buildAppUrl(base, { connectionUrl }) {
  const url = new URL(base);
  if (connectionUrl) url.searchParams.set("connection", connectionUrl);
  return url.toString();
}

function openBrowser(url) {
  const platform = process.platform;
  const command =
    platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", "", url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function contentType(filePath) {
  switch (extname(filePath)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

async function ensureBuild() {
  const indexPath = join(buildDir, "index.html");
  try {
    await access(indexPath);
  } catch {
    throw new Error(
      `red-ui build not found at ${indexPath}. Install a published package or run "pnpm --filter @reddb-io/ui build".`
    );
  }
}

async function serve(args) {
  await ensureBuild();

  const host = readOption(args, "--host", DEFAULT_HOST);
  const port = Number(readOption(args, "--port", String(DEFAULT_PORT)));
  const connectionUrl = readOption(
    args,
    "--connection",
    positional(args)[0] ?? ""
  );

  const server = createServer(async (req, res) => {
    const requested = new URL(req.url ?? "/", `http://${host}:${port}`);
    const pathname = decodeURIComponent(requested.pathname);
    const candidate = resolve(
      buildDir,
      normalize(pathname).replace(/^\/+/, "")
    );
    const rel = relative(buildDir, candidate);
    const insideBuild =
      rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));

    let filePath = insideBuild ? candidate : join(buildDir, "index.html");
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = join(buildDir, "index.html");
    }

    try {
      res.setHeader("Content-Type", contentType(filePath));
      createReadStream(filePath).pipe(res);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(error instanceof Error ? error.message : String(error));
    }
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, host, resolveListen);
  });

  const url = buildAppUrl(`http://${host}:${port}`, { connectionUrl });
  process.stdout.write(`red-ui serving ${buildDir}\n${url}\n`);
  if (hasFlag(args, "--open")) openBrowser(url);
}

function open(args) {
  const appUrl = readOption(
    args,
    "--app-url",
    process.env.RED_UI_APP_URL || DEFAULT_APP_URL
  );
  const connectionUrl = readOption(
    args,
    "--connection",
    positional(args)[0] ?? ""
  );
  const url = buildAppUrl(appUrl, { connectionUrl });
  process.stdout.write(`${url}\n`);
  openBrowser(url);
}

function resolveUiMcpBin() {
  const pkgPath = require.resolve("@reddb-io/ui-mcp/package.json");
  const pkg = JSON.parse(readFileSyncText(pkgPath));
  const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.["ui-mcp"];
  if (!bin) throw new Error("@reddb-io/ui-mcp does not declare a ui-mcp bin");
  return resolve(dirname(pkgPath), bin);
}

function readFileSyncText(path) {
  return statSync(path) && readFileSync(path, "utf8");
}

async function mcp(args) {
  const appUrl = readOption(
    args,
    "--app-url",
    process.env.RED_UI_APP_URL || DEFAULT_APP_URL
  );
  const forwarded = [];
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--app-url") {
      i += 1;
      continue;
    }
    if (arg.startsWith("--app-url=")) continue;
    forwarded.push(arg);
  }
  if (!forwarded.includes("--stdio")) forwarded.push("--stdio");

  const bin = resolveUiMcpBin();
  // The MCP serves the embeddable bundle over http://localhost for local-file
  // mode (#51). We ship it next to this bin at <packageRoot>/dist/embed, so
  // point the child straight at it — saves the MCP from re-resolving @reddb-io/ui
  // and keeps local mode working in odd install layouts. An explicit env wins.
  const embedDir = resolve(packageRoot, "dist", "embed");
  const env = { ...process.env, RED_UI_APP_URL: appUrl };
  if (!env.RED_UI_EMBED_DIR && existsSync(join(embedDir, "index.js"))) {
    env.RED_UI_EMBED_DIR = embedDir;
  }
  const child = spawn(process.execPath, [bin, ...forwarded], {
    stdio: "inherit",
    env,
  });
  await new Promise((resolveExit) => child.on("exit", resolveExit));
  process.exitCode = child.exitCode ?? 0;
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (command === "serve") {
    await serve(args);
    return;
  }
  if (command === "open") {
    open(args);
    return;
  }
  if (command === "mcp") {
    await mcp(args);
    return;
  }

  throw new Error(`Unknown red-ui command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
