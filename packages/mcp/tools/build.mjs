import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vendor = resolve(root, "../../vendor/ds");
const adapter = join(vendor, "adapters/reddb");
const receipt = JSON.parse(
  readFileSync(join(vendor, "design-system.receipt.json"), "utf8")
);
const names = [
  "client",
  "server-capabilities",
  "permission-contract",
  "cluster-status",
  "analytics",
  "ask",
  "dev-console",
];
const files = names.map((name) => `adapters/reddb/src/${name}.ts`);
files.push("adapters/reddb/LICENSE");
for (const file of files) {
  const data = readFileSync(join(vendor, file));
  const hash = createHash("sha256").update(data).digest("hex");
  if (receipt.files[file] !== hash)
    throw new Error(`Design System receipt mismatch: ${file}`);
}
const tempRoot = join(root, ".red/tmp");
mkdirSync(tempRoot, { recursive: true });
const stage = mkdtempSync(join(tempRoot, "mcp-build-"));
try {
  cpSync(join(root, "src"), stage, { recursive: true });
  const stagedAdapter = join(stage, "vendor-adapter");
  mkdirSync(stagedAdapter);
  for (const name of names) {
    const content = readFileSync(join(adapter, "src", `${name}.ts`), "utf8");
    // Node ESM requires explicit extensions. This changes only temporary build
    // input; the pinned source and its receipt remain untouched.
    const nodeSource = content.replace(
      /(from\s+["'])(\.\.?\/[^"']+)(["'])/g,
      (all, prefix, specifier, suffix) =>
        /\.[a-z0-9]+$/i.test(specifier)
          ? all
          : `${prefix}${specifier}.js${suffix}`
    );
    writeFileSync(join(stagedAdapter, `${name}.ts`), nodeSource);
  }
  const config = join(stage, "tsconfig.json");
  writeFileSync(
    config,
    JSON.stringify({
      extends: join(root, "tsconfig.json"),
      compilerOptions: {
        rootDir: stage,
        outDir: join(root, "dist"),
        inlineSources: true,
      },
      include: [join(stage, "**/*.ts")],
    })
  );
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "tsc",
      "-p",
      config,
      ...(process.argv.includes("--check") ? ["--noEmit"] : []),
    ],
    { cwd: root, stdio: "inherit" }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else if (!process.argv.includes("--check")) {
    // Random staging paths must not leak into source maps or change the
    // published bytes between builds. Source contents are embedded by tsc.
    for (const directory of [
      join(root, "dist"),
      join(root, "dist/vendor-adapter"),
    ]) {
      for (const name of readdirSync(directory).filter((name) =>
        name.endsWith(".js.map")
      )) {
        const file = join(directory, name);
        const map = JSON.parse(readFileSync(file, "utf8"));
        map.sources = map.sources.map((source) =>
          source.replace(/^.*\/.red\/tmp\/mcp-build-[^/]+\//, "source/")
        );
        writeFileSync(file, JSON.stringify(map));
      }
    }
    const source = join(root, "dist/vendor-adapter/source");
    mkdirSync(source, { recursive: true });
    for (const name of names)
      cpSync(join(adapter, "src", `${name}.ts`), join(source, `${name}.ts`));
    cpSync(join(adapter, "LICENSE"), join(root, "dist/vendor-adapter/LICENSE"));
  }
} finally {
  rmSync(stage, { recursive: true, force: true });
}
