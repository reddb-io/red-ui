import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const path = (...parts) => resolve(root, ...parts);
const require = createRequire(path("package.json"));
for (const name of ["ui", "ui-kit"])
  execFileSync(
    process.execPath,
    [path("scripts/package-with-design-system.mjs"), name],
    { cwd: root, stdio: "inherit" }
  );
const ts = require("typescript");
for (const name of ["ui", "ui-kit"]) {
  const stage = path(`packages/${name}/.package`),
    pkg = JSON.parse(readFileSync(join(stage, "package.json")));
  assert.equal(pkg.dependencies["@reddb-io/design-system"], undefined);
  assert(!JSON.stringify(pkg.dependencies).includes("workspace:"));
  const ds = join(stage, "vendor/ds"),
    receipt = JSON.parse(readFileSync(join(ds, "design-system.receipt.json")));
  for (const [file, expected] of Object.entries(receipt.files))
    assert.equal(
      createHash("sha256")
        .update(readFileSync(join(ds, file)))
        .digest("hex"),
      expected,
      file
    );
  console.log(
    `${name}: portable dependencies and ${Object.keys(receipt.files).length} exact DS files`
  );
}
const stage = path("packages/ui/.package"),
  file = join(stage, "plain-host.ts");
writeFileSync(
  file,
  'import {mountRedUi, type RedUiEmbedHandle} from "@reddb-io/ui/embed"; export type Runtime=RedUiEmbedHandle["runtime"]; export const mount=mountRedUi;'
);
try {
  const config = ts.readConfigFile(
    path("apps/embed-host/tsconfig.json"),
    ts.sys.readFile
  );
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    path("apps/embed-host"),
    undefined,
    path("apps/embed-host/tsconfig.json")
  );
  const program = ts.createProgram([file], { ...parsed.options, noEmit: true });
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
  assert.deepEqual(diagnostics, []);
  console.log(
    "staged SDK types: plain TypeScript host passed without a Svelte compiler"
  );
} finally {
  rmSync(file, { force: true });
}
