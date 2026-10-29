// Single source of truth for "what version am I" across the Web/PWA, the
// Embeddable Lib, and the Tauri desktop webview (which all run this same
// bundle). Mirrors ../red-skills/src/packages/build-info: the version is
// injected at build time by Vite `define` (see vite.config.ts /
// vite.embed.config.ts) from `packages/ui/package.json` — overridable by the
// `RED_BUILD_VERSION` env the release CI sets from the git tag. Falls back to
// `0.0.0-dev` for an un-stamped local dev build.

declare const __RED_UI_VERSION__: string | undefined;
declare const __RED_UI_GIT_SHA__: string | undefined;
declare const __RED_UI_BUILD_TIME__: string | undefined;

export interface BuildInfo {
  version: string;
  gitSha: string;
  buildTime: string;
}

function injected(read: () => string | undefined): string | undefined {
  try {
    const v = read();
    return typeof v === "string" && v.length > 0 ? v : undefined;
  } catch {
    return undefined;
  }
}

function stripTagPrefix(v: string): string {
  return v.startsWith("v") ? v.slice(1) : v;
}

export function readBuildInfo(): BuildInfo {
  return {
    version: stripTagPrefix(injected(() => __RED_UI_VERSION__) ?? "0.0.0-dev"),
    gitSha: injected(() => __RED_UI_GIT_SHA__) ?? "unknown",
    buildTime: injected(() => __RED_UI_BUILD_TIME__) ?? "unknown",
  };
}

/** The resolved app version, e.g. `0.1.1` (or `0.0.0-dev` un-stamped). */
export const RED_UI_VERSION: string = readBuildInfo().version;
