import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Vitest-only config — avoids the SvelteKit plugin (which boots routing
// machinery we don't need for unit tests). The svelte plugin is here so
// that `.svelte.ts` files using runes (`$state`, `$derived`) are
// preprocessed correctly.
export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
