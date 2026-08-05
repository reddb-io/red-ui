// Anti-hardcode lint command for the Kit.
//
//   pnpm --filter @reddb-io/kit-app lint            # lint the Kit's own source
//   pnpm --filter @reddb-io/kit-app lint <file...>  # lint specific files
//
// Exits non-zero (and prints each offender) when a component carries a value
// no Layer can reassign — a colour or radius the Themes do not own, or a
// spatial step the Density axis ships a role for. Mirrors the Theme Layer's
// lint command (packages/theme/src/lint-cli.ts) down to its output shape,
// because it is the same invariant asked one Layer higher.

import { existsSync } from "node:fs";
import { relative } from "node:path";
import { lintKitFiles } from "./lint";
import { KIT_ROOT, kitSourceFiles } from "./paths";
import { readVocabulary } from "./vocabulary";

const args = process.argv.slice(2);
const files = args.length > 0 ? args : kitSourceFiles();

if (files.length === 0) {
  process.stderr.write("anti-hardcode lint: no Kit source to lint.\n");
  process.exit(1);
}

const missing = files.filter((file) => !existsSync(file));
if (missing.length > 0) {
  for (const file of missing) {
    process.stderr.write(`anti-hardcode lint: file not found: ${file}\n`);
  }
  process.exit(1);
}

const vocabulary = readVocabulary();
const violations = lintKitFiles(files, vocabulary);

if (violations.length > 0) {
  for (const violation of violations) {
    process.stderr.write(
      `${relative(KIT_ROOT, violation.file)}:${violation.line}  ${violation.found}  — ${violation.reason}\n`
    );
  }
  process.stderr.write(
    `\nanti-hardcode lint failed: ${violations.length} hardcoded value(s); ` +
      "every colour and radius a Kit wears must name a token the Themes reassign, " +
      "and every spatial value the Density axis ships a role for must name that role.\n"
  );
  process.exit(1);
}

process.stdout.write(
  "anti-hardcode lint passed: every colour and radius names a Theme-declared token, " +
    "every routable spatial value names a Density role " +
    `(${files.length} file(s); colours ${vocabulary.colours.join(", ")}; radii ${vocabulary.radii.join(", ")}; ` +
    `spatial roles ${Object.keys(vocabulary.spatial).sort().join(", ")}).\n`
);
