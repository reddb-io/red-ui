// The single classifier for desktop-command failures (#115).
//
// Tauri's `invoke` rejects with whatever the Rust `Err` serialized to. Every
// desktop command now returns a structured `{ code, message, detail? }` shape
// (see apps/desktop/src-tauri/src/lib.rs), but older builds and Tauri's own
// plugin/runtime failures can still reject with a bare string or an `Error`.
// This module is the ONE place that inspects the raw thrown value and
// normalizes it, so the standalone-Surface adapters never re-implement the
// `e instanceof Error ? … : String(e)` coercion dance.

/** The serializable error shape returned by Rust desktop commands. */
export interface DesktopCommandError {
  /** Stable machine token, e.g. `KEYCHAIN`, `EMBEDDED_TIMEOUT`, `SIDECAR_SPAWN`. */
  code: string;
  /** Human-readable summary. */
  message: string;
  /** Underlying cause (OS/keyring/serde message) when the command had one. */
  detail?: string;
}

/** Code used for legacy string errors and anything not shaped as a command error. */
export const UNKNOWN_DESKTOP_ERROR_CODE = "UNKNOWN";

/** Type guard for the structured shape a desktop command rejects with. */
export function isDesktopCommandError(x: unknown): x is DesktopCommandError {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as DesktopCommandError).code === "string" &&
    typeof (x as DesktopCommandError).message === "string"
  );
}

/**
 * Normalize any value thrown by a desktop command into a `DesktopCommandError`.
 * Structured errors pass through (with an empty/absent `detail` dropped); bare
 * strings, `Error` instances, and everything else collapse to the `UNKNOWN`
 * code so callers always get a `{ code, message }` pair.
 */
export function classifyDesktopError(e: unknown): DesktopCommandError {
  if (isDesktopCommandError(e)) {
    const detail = e.detail;
    return {
      code: e.code,
      message: e.message,
      ...(typeof detail === "string" && detail.length > 0 ? { detail } : {}),
    };
  }
  if (typeof e === "string") {
    return { code: UNKNOWN_DESKTOP_ERROR_CODE, message: e };
  }
  if (e instanceof Error) {
    return { code: UNKNOWN_DESKTOP_ERROR_CODE, message: e.message || String(e) };
  }
  return { code: UNKNOWN_DESKTOP_ERROR_CODE, message: String(e) };
}

/** Human-readable one-liner for a classified desktop error. */
export function desktopErrorMessage(e: unknown): string {
  const c = classifyDesktopError(e);
  return c.detail ? `${c.message}: ${c.detail}` : c.message;
}

/**
 * An `Error` carrying the classified `code`/`detail`, with `message` set to the
 * human-readable one-liner. Adapters throw this so downstream consumers (e.g.
 * the connection provider) can read `.message` without any coercion, while
 * still being able to branch on `.code`.
 */
export class DesktopError extends Error {
  readonly code: string;
  readonly detail?: string;

  constructor(classified: DesktopCommandError) {
    super(
      classified.detail
        ? `${classified.message}: ${classified.detail}`
        : classified.message
    );
    this.name = "DesktopError";
    this.code = classified.code;
    this.detail = classified.detail;
  }

  /** Classify a raw thrown value and wrap it. */
  static from(e: unknown): DesktopError {
    return e instanceof DesktopError ? e : new DesktopError(classifyDesktopError(e));
  }
}
