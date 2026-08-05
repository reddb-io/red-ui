import { readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// kits/app/tools
const here = dirname(fileURLToPath(import.meta.url));

export const KIT_ROOT = join(here, "..");
/** The vendorable component source — the whole of what a consumer receives. */
export const SRC_DIR = join(KIT_ROOT, "src");
/** The Kit's routing manifest, read by ds-sync (ADR 0002). */
export const KIT_MANIFEST = join(KIT_ROOT, "kit.json");
/** Build output: the vendorable source, staged for the release bundle. */
export const DIST_DIR = join(KIT_ROOT, "dist");

/** Every file under `dir`, recursively, sorted — a stable, reproducible order. */
export function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else out.push(full);
  }
  return out;
}

/**
 * The Kit's component source files: what the lint reads and what the Primitive
 * test inspects. Discovered rather than listed, so a component added without a
 * test or with a hardcoded colour is caught the moment its file exists.
 */
export function kitSourceFiles(dir: string = SRC_DIR): string[] {
  return filesUnder(dir).filter(
    (file) => file.endsWith(".svelte") || file.endsWith(".ts")
  );
}

/** The Kit's Svelte components, by file. */
export function kitComponentFiles(dir: string = SRC_DIR): string[] {
  return filesUnder(dir).filter((file) => file.endsWith(".svelte"));
}
