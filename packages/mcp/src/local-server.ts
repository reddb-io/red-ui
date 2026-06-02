// Local-file mode for the MCP App (#48, ADR-0006).
//
// A browser Surface cannot reach a filesystem `.rdb`, and the MCP process (Node)
// cannot open it either — reddb's embedded mode is Rust-only. So for a local
// target we spawn ONE `red server --http --http-bind 127.0.0.1:<ephemeral>
// --path <file>` child that owns the file, wait for `/stats` to report healthy,
// and hand the UI `?cs=http://127.0.0.1:<port>`. The child is torn down on MCP
// exit/disconnect — no orphan servers. We never reimplement the reddb HTTP API;
// we shell out to the `red` binary.

import { spawn, type ChildProcess } from "node:child_process";
import { accessSync, constants as fsConstants } from "node:fs";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Modules that may expose reddb's binary resolver. `@reddb-io/sdk` is the
// canonical name in ADR-0006; `reddb-cli` is the package that currently ships
// `resolveBinary`. Either is optional — neither is a hard dependency of this
// package, so resolution falls through to a PATH `red` when absent.
const SDK_CANDIDATES = ["@reddb-io/sdk", "reddb-cli"] as const;

export interface RedBinary {
  binaryPath: string;
  /** Where we found it: an SDK package name, "path", or "env". */
  source: string;
}

export interface LocalServerHandle {
  baseUrl: string;
  port: number;
  filePath: string;
  readOnly: boolean;
  child: ChildProcess;
  /** Idempotent teardown — SIGTERM then SIGKILL, resolves once the child exits. */
  stop(): Promise<void>;
}

export interface SpawnLocalServerOptions {
  /** Connection target as received by the tool (path / file:// / ~/… / *.rdb). */
  target: string;
  readOnly?: boolean;
  /** Override binary resolution (tests, explicit config). */
  binaryPath?: string;
  /** Override the ephemeral port (tests). */
  port?: number;
  /** Max time to wait for `/stats` to report healthy. Default 10s. */
  healthTimeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Resolve a fuzzy local target into an absolute filesystem path the `red`
 * binary can `--path`. Handles `file://` URLs, `~`/`~/…` home expansion, and
 * relative paths (resolved against the MCP process cwd).
 */
export function resolveLocalFilePath(target: string): string {
  const t = target.trim();
  if (/^file:\/\//i.test(t)) return fileURLToPath(t);
  if (t === "~") return homedir();
  if (t.startsWith("~/")) return join(homedir(), t.slice(2));
  if (isAbsolute(t)) return t;
  return resolve(process.cwd(), t);
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Find an executable by name on PATH (mirrors `which`). */
function findOnPath(name: string): string | null {
  const paths = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const names = process.platform === "win32" ? [name, `${name}.exe`] : [name];
  for (const dir of paths) {
    for (const candidate of names) {
      const full = join(dir, candidate);
      if (process.platform === "win32" ? true : isExecutable(full)) {
        // On win32 PATHEXT handling is approximate; accept the first match.
        if (process.platform === "win32" && !isFile(full)) continue;
        return full;
      }
    }
  }
  return null;
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
 * Resolve the `red` binary: explicit `RED_BINARY` env → `@reddb-io/sdk`'s
 * subprocess binary (or `reddb-cli`'s) → a PATH `red`. Throws an actionable
 * error when none is found.
 */
export async function resolveRedBinary(): Promise<RedBinary> {
  const envBin = process.env.RED_BINARY?.trim();
  if (envBin) return { binaryPath: envBin, source: "env" };

  for (const name of SDK_CANDIDATES) {
    try {
      const mod: Record<string, unknown> = await import(name);
      const resolveBinary = (mod.resolveBinary ??
        (mod.default as Record<string, unknown> | undefined)?.resolveBinary) as
        | ((opts?: unknown) => Promise<string> | string)
        | undefined;
      if (typeof resolveBinary === "function") {
        const binaryPath = await resolveBinary();
        if (binaryPath && isFile(binaryPath)) {
          return { binaryPath, source: name };
        }
      }
    } catch {
      // Not installed or resolution failed; try the next strategy.
    }
  }

  const onPath = findOnPath("red");
  if (onPath) return { binaryPath: onPath, source: "path" };

  throw new Error(
    "Cannot open a local .rdb file: no reddb `red` binary found. " +
      "Install the reddb SDK (`pnpm add @reddb-io/sdk`) so its bundled binary " +
      "can be used, put `red` on your PATH, or set RED_BINARY to its absolute path. " +
      "See ADR-0006."
  );
}

/** Reserve a free TCP port on the loopback interface, then release it. */
function pickEphemeralPort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const srv = createServer();
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

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Poll `${baseUrl}/stats` until it answers 200, the child exits, the timeout
 * elapses, or the signal aborts. `/stats` is reddb's canonical proof-of-life
 * (CLAUDE.md: `/health` returns 503 by design).
 */
async function waitForHealthy(
  baseUrl: string,
  child: ChildProcess,
  timeoutMs: number,
  getStderr: () => string,
  signal?: AbortSignal
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    if (signal?.aborted) throw new Error("Local server startup aborted.");
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `red server exited (code ${child.exitCode}, signal ${child.signalCode}) ` +
          `before /stats became healthy.${getStderr() ? `\n${getStderr()}` : ""}`
      );
    }
    try {
      const res = await fetch(`${baseUrl}/stats`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return;
    } catch {
      // Not accepting connections yet — keep polling.
    }
    if (Date.now() > deadline) {
      throw new Error(
        `red server did not report healthy at ${baseUrl}/stats within ` +
          `${timeoutMs}ms.${getStderr() ? `\n${getStderr()}` : ""}`
      );
    }
    await delay(150);
  }
}

/**
 * Spawn one `red server` that owns `target`, wait for `/stats` to report
 * healthy, and return a handle whose `stop()` tears the child down.
 */
export async function spawnLocalServer(
  options: SpawnLocalServerOptions
): Promise<LocalServerHandle> {
  const {
    target,
    readOnly = false,
    healthTimeoutMs = 10_000,
    signal,
  } = options;
  const filePath = resolveLocalFilePath(target);
  const binaryPath =
    options.binaryPath ?? (await resolveRedBinary()).binaryPath;
  const port = options.port ?? (await pickEphemeralPort());
  const baseUrl = `http://127.0.0.1:${port}`;

  const args = [
    "server",
    "--http",
    "--http-bind",
    `127.0.0.1:${port}`,
    "--path",
    filePath,
  ];
  if (readOnly) args.push("--read-only");

  const child = spawn(binaryPath, args, {
    stdio: ["ignore", "ignore", "pipe"],
  });

  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
    if (stderr.length > 4000) stderr = stderr.slice(-4000);
  });

  const handle: LocalServerHandle = {
    baseUrl,
    port,
    filePath,
    readOnly,
    child,
    stop: makeStop(child),
  };

  try {
    await waitForHealthy(
      baseUrl,
      child,
      healthTimeoutMs,
      () => stderr.trim(),
      signal
    );
  } catch (error) {
    await handle.stop();
    throw error;
  }

  trackServer(handle);
  return handle;
}

function makeStop(child: ChildProcess): () => Promise<void> {
  let stopping: Promise<void> | null = null;
  return () => {
    if (stopping) return stopping;
    stopping = new Promise<void>((resolveStop) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolveStop();
        return;
      }
      const onExit = () => {
        clearTimeout(killTimer);
        resolveStop();
      };
      child.once("exit", onExit);
      const killTimer = setTimeout(() => {
        child.kill("SIGKILL");
      }, 3000);
      killTimer.unref?.();
      child.kill("SIGTERM");
    });
    return stopping;
  };
}

// --- lifecycle registry: guarantee no orphan servers on MCP exit/disconnect ---

const liveServers = new Set<LocalServerHandle>();
let exitHooksInstalled = false;

function installExitHooks(): void {
  if (exitHooksInstalled) return;
  exitHooksInstalled = true;

  // Synchronous best-effort kill on hard exit — handlers can't await.
  process.on("exit", () => {
    for (const handle of liveServers) {
      try {
        handle.child.kill("SIGKILL");
      } catch {
        // already gone
      }
    }
  });

  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(sig, () => {
      for (const handle of liveServers) {
        try {
          handle.child.kill("SIGKILL");
        } catch {
          // already gone
        }
      }
      process.exit(0);
    });
  }
}

function trackServer(handle: LocalServerHandle): void {
  installExitHooks();
  liveServers.add(handle);
  handle.child.once("exit", () => liveServers.delete(handle));
}

/** Stop every tracked local server (MCP transport close / shutdown). */
export async function stopAllLocalServers(): Promise<void> {
  const handles = [...liveServers];
  await Promise.all(handles.map((h) => h.stop()));
}
