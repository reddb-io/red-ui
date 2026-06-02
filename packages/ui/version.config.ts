import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Build-time version stamp shared by the SvelteKit (PWA/desktop) build and the
// Embeddable Lib build. Source of truth: packages/ui/package.json `version`
// (changeset-managed, version-locked with ui-kit/ui-mcp), overridable by the
// `RED_BUILD_VERSION` env the release CI sets from the git tag. Mirrors the
// ../red-skills build-info pattern. Consumed by src/lib/build-info.ts.
export function versionDefines(): Record<string, string> {
  const here = dirname(fileURLToPath(import.meta.url));
  let pkgVersion = "0.0.0-dev";
  try {
    pkgVersion =
      JSON.parse(readFileSync(join(here, "package.json"), "utf8")).version ??
      pkgVersion;
  } catch {
    // fall through to the dev default
  }
  const version = (process.env.RED_BUILD_VERSION || pkgVersion).replace(
    /^v/,
    ""
  );
  return {
    __RED_UI_VERSION__: JSON.stringify(version),
    __RED_UI_GIT_SHA__: JSON.stringify(
      process.env.RED_BUILD_GIT_SHA || "unknown"
    ),
    __RED_UI_BUILD_TIME__: JSON.stringify(
      process.env.RED_BUILD_TIME || "unknown"
    ),
  };
}
