import { defineWorkspace } from "vitest/config";

// Two projects share one base config (vitest.config.ts):
//   - node:    the default logic/SSR suite. Renders components with
//              `svelte/server` to a string; must NOT resolve Svelte's browser
//              entry or the server renderer trips over `document`.
//   - browser: component tests that `mount()` into a real DOM (happy-dom) to
//              exercise interaction — e.g. the ErrorBoundary shield (#126).
//              These need Svelte's browser entry via `resolve.conditions`.
// The split keeps the browser-only condition off the node suite, which would
// otherwise break the `svelte/server` render tests.
export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "node",
      environment: "node",
      include: ["src/**/*.test.ts"],
      exclude: ["src/**/*.svelte.test.ts"],
    },
  },
  {
    extends: "./vitest.config.ts",
    resolve: { conditions: ["browser"] },
    test: {
      name: "browser",
      environment: "happy-dom",
      include: ["src/**/*.svelte.test.ts"],
    },
  },
]);
