import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// BASE_PATH lets the same static bundle work at the site root (embedded
// in the `red` server / Tauri / dev) AND under a subpath if needed.
// ui.reddb.io is served from GitHub Pages at the domain root, so the
// Pages workflow keeps this empty.
const base = process.env.BASE_PATH ?? "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    paths: { base },
    files: {
      assets: "../../vendor/ds/hosts/workspace/static",
      routes: "../../vendor/ds/hosts/workspace/src/routes",
      lib: "../../vendor/ds/hosts/workspace/src/lib",
      appTemplate: "../../vendor/ds/hosts/workspace/src/app.html",
    },
    adapter: adapter({
      pages: "build",
      assets: "build",
      // GitHub Pages serves this shell for collection URLs with dynamic IDs.
      fallback: "404.html",
      precompress: false,
      strict: false,
    }),
  },
};

export default config;
