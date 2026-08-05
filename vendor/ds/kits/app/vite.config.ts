import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [svelte()],
  // The Kit's tests mount components the way a browser does — `mount()` into a
  // real element, then click it — so they need the browser build of Svelte and
  // a document to mount into. That is the difference between a component test
  // and the showcase's smoke test, which renders to a string on the server:
  // only one of them can prove that a disabled Button ignores a click.
  resolve: { conditions: ["browser"] },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "jsdom",
  },
});
