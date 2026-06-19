import tailwindcssPlugin from "@tailwindcss/vite";
import type { PluginOption } from "vite";

/**
 * `@tailwindcss/vite` that skips Svelte `<style>` virtual modules.
 *
 * Tailwind's transform compiles every module whose id contains `&lang.css`,
 * which includes svelte-plugin's `Foo.svelte?svelte&type=style&lang.css`
 * modules. On a *cold* `vite dev` request (the style fetched before svelte has
 * transformed its parent), Tailwind reads the raw `.svelte` file off disk and
 * parses the `<script>` as CSS — crashing the dev server with
 * `Invalid declaration: ...`. It only bites in dev (`tauri dev`); `vite build`
 * resolves parent-first.
 *
 * Our component `<style>` blocks are plain CSS (no `@apply`/`@reference`/
 * `theme()`), so Tailwind has no reason to touch them. Skipping them removes
 * the crash without losing any functionality.
 */
export function tailwindcss(): PluginOption[] {
  const plugins = tailwindcssPlugin() as PluginOption[];
  const isSvelteStyle = (id: string) =>
    id.includes(".svelte?") && id.includes("type=style");
  for (const plugin of plugins) {
    if (!plugin || typeof plugin !== "object") continue;
    const slot = plugin as { transform?: unknown };
    const t = slot.transform;
    if (!t) continue;
    const handler =
      typeof t === "function" ? t : (t as { handler?: unknown }).handler;
    if (typeof handler !== "function") continue;
    const fn = handler as (
      this: unknown,
      code: string,
      id: string,
      opts?: unknown
    ) => unknown;
    const wrapped = function (
      this: unknown,
      code: string,
      id: string,
      opts?: unknown
    ) {
      if (isSvelteStyle(id)) return null;
      return fn.call(this, code, id, opts);
    };
    slot.transform =
      typeof t === "function"
        ? wrapped
        : { ...(t as object), handler: wrapped };
  }
  return plugins;
}
