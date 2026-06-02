import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { versionDefines } from "./version.config";

export default defineConfig({
  plugins: [
    tailwindcss(),
    svelte({ hot: false, compilerOptions: { css: "injected" } }),
  ],
  define: versionDefines(),
  resolve: {
    alias: {
      "#reddb": resolve(__dirname, "src/lib/reddb/index.ts"),
      $lib: resolve(__dirname, "src/lib"),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/lib/embed/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist/embed",
    emptyOutDir: true,
    sourcemap: true,
  },
});
