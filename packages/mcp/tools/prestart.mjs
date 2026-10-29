import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const build = join(root, "tools/build.mjs");
// A source checkout has the build tool and vendored DS; published packages
// contain prebuilt dist and this launcher, not the workspace build tool.
if (existsSync(build)) {
  const result = spawnSync(process.execPath, [build], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
