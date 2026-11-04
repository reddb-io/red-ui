import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { componentFlavorResolution } from "../../scripts/flavor-resolution.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [componentFlavorResolution(repoRoot), svelte()],
  resolve: {
    conditions: ["browser"],

  },
  server: { fs: { allow: [repoRoot, realpathSync(new URL("../../node_modules", import.meta.url))] } },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    maxWorkers: 1,
  },
});
