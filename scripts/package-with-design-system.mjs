import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Public source exports must carry the private vendored package they use.
// Stage a portable package without changing workspace sources or DS bytes.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2];
if (name !== "ui" && name !== "ui-kit")
  throw new Error("Expected ui or ui-kit");
const source = join(root, "packages", name);
const stage = join(source, ".package");
const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
const ds = JSON.parse(
  readFileSync(join(root, "vendor/ds/package.json"), "utf8")
);
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const path of [
  "src/lib",
  "src/tokens",
  "src/app.css",
  "bin",
  "build",
  "dist/embed",
  "README.md",
]) {
  if (existsSync(join(source, path)))
    cpSync(join(source, path), join(stage, path), { recursive: true });
}
cpSync(join(root, "vendor/ds"), join(stage, "vendor/ds"), {
  recursive: true,
  filter: (path) =>
    !path.replaceAll("\\", "/").split("/").includes("node_modules"),
});

function rewrite(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) rewrite(path);
    else if (/\.(ts|svelte|css)$/.test(entry.name)) {
      const original = readFileSync(path, "utf8");
      const content = original.replace(
        /(["'])@reddb-io\/design-system\/([^"']+)\1/g,
        (_, quote, subpath) => {
          const exact = ds.exports[`./${subpath}`];
          const wildcard = Object.entries(ds.exports).find(([key]) => {
            const [prefix, suffix] = key.split("*");
            return (
              suffix !== undefined &&
              `./${subpath}`.startsWith(prefix) &&
              `./${subpath}`.endsWith(suffix)
            );
          });
          const contract = exact ?? wildcard?.[1];
          let target =
            typeof contract === "string"
              ? contract
              : (contract?.svelte ?? contract?.default);
          if (!target) throw new Error(`Unknown DS export: ${subpath}`);
          if (!exact && wildcard) {
            const [prefix, suffix] = wildcard[0].split("*");
            const path = `./${subpath}`;
            const match = path.slice(
              prefix.length,
              path.length - suffix.length
            );
            if (!match || match.includes(".."))
              throw new Error(`Invalid DS export: ${subpath}`);
            target = target.replace("*", match);
          }
          const local = relative(
            dirname(path),
            join(stage, "vendor/ds", target)
          )
            .replaceAll("\\", "/")
            // Source hosts resolve TypeScript without opting into explicit
            // .ts import suffixes. Keep .svelte and asset suffixes intact.
            .replace(/\.ts$/, "");
          return `${quote}${local.startsWith(".") ? local : `./${local}`}${quote}`;
        }
      );
      const portable = content.replace(
        /@source "[^"]*vendor\/ds\/kits"/g,
        () => {
          const local = relative(
            dirname(path),
            join(stage, "vendor/ds/kits")
          ).replaceAll("\\", "/");
          return `@source "${local}"`;
        }
      );
      if (portable !== original) writeFileSync(path, portable);
    }
  }
}
rewrite(join(stage, "src"));
manifest.dependencies = { ...manifest.dependencies, ...ds.dependencies };
delete manifest.dependencies[ds.name];
for (const group of ["dependencies", "peerDependencies"]) {
  for (const [dependency, version] of Object.entries(manifest[group] ?? {})) {
    if (!version.startsWith("workspace:")) continue;
    const directory =
      dependency === "@reddb-io/ui-mcp"
        ? "mcp"
        : dependency.replace("@reddb-io/", "");
    const local = JSON.parse(
      readFileSync(join(root, "packages", directory, "package.json"), "utf8")
    );
    manifest[group][dependency] = local.version;
  }
}
manifest.files.push("vendor/ds");
manifest.scripts = {};
delete manifest.devDependencies;
delete manifest.publishConfig.directory;
delete manifest.publishConfig.linkDirectory;
writeFileSync(
  join(stage, "package.json"),
  `${JSON.stringify(manifest, null, 2)}\n`
);
console.log(
  `Staged ${manifest.name} with DS source and assets, no private registry dependency.`
);
