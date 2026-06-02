#!/usr/bin/env node
// Propagate the changeset-managed npm version (packages/ui/package.json, the
// version-locked source of truth for @reddb-io/ui + ui-kit + ui-mcp) into the
// Tauri desktop app, which lives outside the npm `fixed` group and would
// otherwise drift. Run from `release:version` after `changeset version`, and
// safe to run anytime (idempotent). Keeps tauri.conf.json, Cargo.toml, and the
// desktop package.json all reporting the same version as the npm artifacts, so
// the desktop binary/installer/updater version matches the bundle it ships.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = JSON.parse(
  readFileSync(join(root, "packages/ui/package.json"), "utf8")
).version;
if (!version) {
  console.error("sync-desktop-version: no version in packages/ui/package.json");
  process.exit(1);
}

const edits = [];

// tauri.conf.json — top-level "version"
{
  const path = join(root, "apps/desktop/src-tauri/tauri.conf.json");
  const conf = JSON.parse(readFileSync(path, "utf8"));
  if (conf.version !== version) {
    conf.version = version;
    writeFileSync(path, JSON.stringify(conf, null, 2) + "\n");
    edits.push(`tauri.conf.json → ${version}`);
  }
}

// apps/desktop/package.json — "version"
{
  const path = join(root, "apps/desktop/package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  if (pkg.version !== version) {
    pkg.version = version;
    writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
    edits.push(`apps/desktop/package.json → ${version}`);
  }
}

// Cargo.toml — the [package] version line only (never a dependency's version).
{
  const path = join(root, "apps/desktop/src-tauri/Cargo.toml");
  const toml = readFileSync(path, "utf8");
  const updated = toml.replace(
    /(\[package\][\s\S]*?\nversion\s*=\s*")[^"]*(")/,
    `$1${version}$2`
  );
  if (updated !== toml) {
    writeFileSync(path, updated);
    edits.push(`Cargo.toml → ${version}`);
  }
}

if (edits.length === 0) {
  console.log(`sync-desktop-version: desktop already at ${version}`);
} else {
  console.log(`sync-desktop-version: ${edits.join(", ")}`);
}
