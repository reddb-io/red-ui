import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { tailwindcss } from "./vite-tailwind-svelte";
import { versionDefines } from "./version.config";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: versionDefines(),
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    // Allow serving workspace-sibling sources (e.g. @reddb-io/ui-kit) in dev —
    // they live outside packages/ui, so default fs.allow rejects them.
    fs: { allow: [searchForWorkspaceRoot(process.cwd())] },
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
