import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Vitest-only config — avoids the SvelteKit plugin (which boots routing
// machinery we don't need for unit tests). The svelte plugin is here so
// that `.svelte.ts` files using runes (`$state`, `$derived`) are
// preprocessed correctly.
export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    // `@reddb-io/ui-kit` only exposes a `svelte` export condition, which the
    // test resolver doesn't apply — alias the package to its source entry so
    // tests can import the kit's primitives and helpers directly.
    alias: {
      $lib: resolve(__dirname, "src/lib"),
      "@reddb-io/ui-kit": resolve(__dirname, "../ui-kit/src/lib/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
