import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Shared base for the vitest workspace (see vitest.workspace.ts). Avoids the
// SvelteKit plugin (which boots routing machinery we don't need for unit
// tests). The svelte plugin is here so that `.svelte.ts` files using runes
// (`$state`, `$derived`) are preprocessed correctly. Per-project `test`
// settings (environment, include, resolve conditions) live in the workspace
// so the browser-only condition never leaks onto the node/SSR suite.
//
// `configFile: false` skips svelte.config.js and with it vitePreprocess, whose
// only job here was <style> preprocessing. vitest 2 runs on vite 5 while
// vite-plugin-svelte 5 calls vite 6's preprocessCSS, which throws ("Cannot
// create proxy with a non-object") on the first <style> block it meets — the
// design system's Base barrel reaches bits-ui components that carry one.
// Svelte compiles plain CSS and TypeScript on its own, so nothing is lost.
export default defineConfig({
  plugins: [svelte({ hot: false, configFile: false })],
  resolve: {
    // `@reddb-io/ui-kit` only exposes a `svelte` export condition, which the
    // test resolver doesn't apply — alias the package to its source entry so
    // tests can import the kit's primitives and helpers directly.
    alias: {
      $lib: resolve(__dirname, "src/lib"),
      "@reddb-io/ui-kit": resolve(__dirname, "../ui-kit/src/lib/index.ts"),
    },
  },
});
