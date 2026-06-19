import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { tailwindcss } from "./vite-tailwind-svelte";
import { versionDefines } from "./version.config";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  define: versionDefines(),
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
