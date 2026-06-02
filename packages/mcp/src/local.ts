// Local-file handler seam (ADR-0006).
//
// A browser cannot open an `.rdb` file, so a local target ultimately needs the
// MCP process to spawn `red server --http-bind … --path <file>` and hand the UI
// the resulting `http://127.0.0.1:<port>`. That spawn lands in a later slice;
// this module is the seam it plugs into. Today it routes the classified local
// target to a clear "not yet" result and never spawns a child process.

import type { LocalTarget } from "./target.js";

export interface LocalHandlerResult {
  /** Human/model-facing text. */
  message: string;
  /**
   * Connection string for the Open Contract once the local server exists. Null
   * until the local-file slice lands — callers must not seed `?cs=` with it.
   */
  connectionString: string | null;
  /** True once a local `red server` is spawned for the file. Always false today. */
  spawned: boolean;
}

/**
 * Route a classified local target. The seam the local-file slice builds on; for
 * now it reports that local-file support is not yet available, without spawning
 * any process.
 */
export function handleLocalTarget(target: LocalTarget): LocalHandlerResult {
  return {
    message:
      `Detected a local reddb file (${target.path}). Opening local files needs a ` +
      `spawned \`red server\`, which is not available yet — connect to a running ` +
      `cluster with an http(s):// or red:// URL for now.`,
    connectionString: null,
    spawned: false,
  };
}
