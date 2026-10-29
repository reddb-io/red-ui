// Inventory migration debt from actual Svelte syntax. Zero findings is necessary
// (not sufficient) for UI absorption: delivered hosts still need runtime proof.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const { parse } = createRequire(
  new URL("../packages/ui/package.json", import.meta.url)
)("svelte/compiler");
const primitive = new Set([
  "details",
  "summary",
  "pre",
  "a",
  "button",
  "input",
  "textarea",
  "select",
  "table",
  "dialog",
  "progress",
  "svg",
  "canvas",
]);
const legacy =
  /\b(?:bg-bg-\d|text-fg-\d|border-line-\d|text-accent|bg-accent|text-warn|text-ok|text-danger)\b/g;
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(resolve(dir, entry.name))
          : [resolve(dir, entry.name)]
      )
    )
  ).flat();
}
const findings = [];
const ts = createRequire(import.meta.url)("typescript");
const localImplementation = [];
for (const sourceRoot of ["packages/ui/src", "packages/ui-kit/src"]) {
  for (const path of await files(resolve(root, sourceRoot))) {
    if (relative(root, path) === "packages/ui/src/app.d.ts") continue;
    const source = await readFile(path, "utf8");
    let facade = false;
    if (path.endsWith(".ts")) {
      const ast = ts.createSourceFile(
        path,
        source,
        ts.ScriptTarget.Latest,
        true
      );
      facade =
        ast.statements.length > 0 &&
        ast.statements.every(
          (node) =>
            ts.isExportDeclaration(node) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier) &&
            node.moduleSpecifier.text.startsWith("@reddb-io/design-system/")
        );
    } else if (path.endsWith(".css")) {
      facade = /^@import "@reddb-io\/design-system\/[^"\n]+";\s*$/.test(source);
    }
    if (!facade) localImplementation.push(relative(root, path));
  }
}
const manifest = JSON.parse(
  await readFile(resolve(root, "design-system.manifest.json"), "utf8")
);
const workspaceHostSelected = manifest.hosts?.includes("workspace") === true;

// This route deliberately attacks Shadow DOM isolation with hostile host CSS.
// It is test infrastructure, never a workspace component or presentation source.
const testFixtures = [];
for (const sourceRoot of ["packages/ui/src", "packages/ui-kit/src"]) {
  for (const path of (await files(resolve(root, sourceRoot)))
    .filter(
      (path) => path.endsWith(".svelte") && !path.endsWith(".fixture.svelte")
    )
    .sort()) {
    if (testFixtures.some((entry) => entry.file === relative(root, path)))
      continue;
    const source = await readFile(path, "utf8"),
      counts = {};
    const add = (key) => (counts[key] = (counts[key] ?? 0) + 1);
    const ast = parse(source, { modern: true });
    const glyphs = new Set(
      (ast.instance?.content?.body ?? [])
        .filter(
          (node) =>
            node.type === "ImportDeclaration" &&
            /^(?:lucide-svelte|@lucide\/svelte|lucide-react)/.test(
              node.source.value
            )
        )
        .flatMap((node) =>
          node.specifiers.map((specifier) => specifier.local.name)
        )
    );
    function visit(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "RegularElement" && primitive.has(node.name))
        add(`native:${node.name}`);
      if (node.type === "Component" && glyphs.has(node.name))
        add("local:icons");
      for (const [key, value] of Object.entries(node)) {
        if (["loc", "start", "end", "metadata", "parent"].includes(key))
          continue;
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object") visit(value);
      }
    }
    visit(ast.fragment);
    if (ast.css) add("local:styles");
    const legacyCount = [...source.matchAll(legacy)].length;
    if (legacyCount) counts["local:legacy-tokens"] = legacyCount;
    if (Object.keys(counts).length)
      findings.push({ file: relative(root, path), counts });
  }
}
findings.sort((a, b) => a.file.localeCompare(b.file));
const report = {
  sourceFacadeComplete:
    workspaceHostSelected && localImplementation.length === 0,
  workspaceHostSelected,
  localImplementation,
  primitivesComplete: findings.length === 0,
  filesWithLocalPresentation: findings.length,
  findings,
  testFixtures,
};
const baselinePath = resolve(root, "docs/migration/ui-ownership.json");
if (process.argv.includes("--write")) {
  await mkdir(resolve(root, "docs/migration"), { recursive: true });
  await writeFile(baselinePath, JSON.stringify(report, null, 2) + "\n");
}
if (process.argv.includes("--check")) {
  const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
  const previous = new Map(
    baseline.findings.map((entry) => [entry.file, entry.counts])
  );
  const increases = findings.flatMap((entry) =>
    Object.entries(entry.counts)
      .filter(([key, value]) => value > (previous.get(entry.file)?.[key] ?? 0))
      .map(([key]) => `${entry.file}: ${key}`)
  );
  if (increases.length) {
    console.error(
      `New local presentation outside DS:\n${increases.join("\n")}`
    );
    process.exitCode = 1;
  }
}
console.log(JSON.stringify(report, null, 2));
if (
  process.argv.includes("--strict") &&
  (!report.primitivesComplete || !report.sourceFacadeComplete)
)
  process.exitCode = 1;
