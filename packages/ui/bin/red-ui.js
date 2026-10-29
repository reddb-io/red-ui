#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runCli } from "@reddb-io/design-system/hosts/workspace/cli";
await runCli({
  packageRoot: resolve(dirname(fileURLToPath(import.meta.url)), ".."),
}).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
