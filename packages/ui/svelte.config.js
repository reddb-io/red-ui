import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

// BASE_PATH lets the same static bundle work at the site root (embedded
// in the `red` server / Tauri / dev) AND under a subpath (GitHub Pages
// at reddb-io.github.io/red-ui). The release workflow sets it for the
// Pages job; everywhere else it stays empty.
const base = process.env.BASE_PATH ?? ''

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    paths: { base },
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: false,
    }),
  },
}

export default config
