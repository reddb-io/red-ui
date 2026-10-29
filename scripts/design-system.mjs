import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "design-system.manifest.json"), "utf8")
);
const command = process.argv[2];
if (command !== "check" && command !== "sync") {
  throw new Error("Usage: node scripts/design-system.mjs <check|sync>");
}

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

if (command === "sync") {
  // Use the producer from the pinned release, even when the sibling checkout
  // is on an older branch. Never move or install into that primary checkout.
  const common = resolve(root, git(root, ["rev-parse", "--git-common-dir"]));
  const source =
    process.env.DESIGN_SYSTEM_PATH ??
    resolve(dirname(common), "../design-system");
  git(source, ["fetch", "origin", "tag", manifest.version]);
  const tool = join(
    source,
    ".red/tmp/worktrees/manual",
    `ds-sync-${process.pid}`
  );
  git(source, ["worktree", "add", "--detach", tool, manifest.version]);
  try {
    execFileSync(
      "pnpm",
      // The current producer also imports the catalogue's source resolver.
      // Install its dependencies in the disposable tool checkout as well.
      [
        "install",
        "--frozen-lockfile",
        "--filter",
        "@reddb-io/producer",
        "--filter",
        "@reddb-io/catalogue",
      ],
      {
        cwd: tool,
        stdio: "inherit",
      }
    );
    execFileSync(
      process.execPath,
      [
        join(tool, "scripts/producer/node_modules/tsx/dist/cli.mjs"),
        join(tool, "scripts/producer/src/cli.ts"),
      ],
      { cwd: root, stdio: "inherit" }
    );
  } finally {
    // Only this invocation's disposable tool checkout is removed.
    git(source, ["worktree", "remove", "--force", tool]);
  }
}

const dest = join(root, manifest.dest);
const receipt = JSON.parse(
  readFileSync(join(dest, "design-system.receipt.json"), "utf8")
);
if (
  receipt.version !== manifest.version ||
  receipt.framework !== manifest.framework
) {
  throw new Error(
    "DS receipt does not match the manifest pin/framework. Run pnpm ds:sync."
  );
}
if (receipt.fontLoading !== (manifest.fontLoading ?? "complete")) {
  throw new Error(
    "DS receipt does not match the manifest font policy. Run pnpm ds:sync."
  );
}
for (const kit of manifest.kits) {
  if (!receipt.kits.includes(kit))
    throw new Error(`DS receipt is missing declared Kit ${kit}`);
}
for (const adapter of manifest.adapters ?? []) {
  if (!receipt.adapters?.includes(adapter))
    throw new Error(`DS receipt is missing declared adapter ${adapter}`);
}
for (const host of manifest.hosts ?? []) {
  if (!receipt.hosts?.includes(host))
    throw new Error(`DS receipt is missing declared host ${host}`);
}
for (const [name, expected] of Object.entries(receipt.files)) {
  const actual = createHash("sha256")
    .update(readFileSync(join(dest, name)))
    .digest("hex");
  if (actual !== expected)
    throw new Error(`Vendored DS differs from its receipt: ${name}`);
}
console.log(
  `DS ${receipt.version} (${receipt.framework}): ${Object.keys(receipt.files).length} files verified.`
);
