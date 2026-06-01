<script lang="ts">
  // The full SvelteKit Surface: it wraps the same Mountable Root used for
  // embedding, but injects a Kit-backed router so the URL, deep links,
  // refresh, and the back button keep working. The route `+page.svelte`
  // files exist only to make each URL a valid route — the Root reads the
  // location from the Kit router and renders the matching view itself.
  import type { Snippet } from 'svelte'
  import { base } from '$app/paths'
  import { page } from '$app/state'
  import '../app.css'
  import Workspace from '$lib/Workspace.svelte'
  import { createKitRouter } from './kit-router.svelte'

  let { children }: { children: Snippet } = $props()

  const router = createKitRouter()
  const path = $derived(page.url.pathname.slice(base.length) || '/')
  const renderRouteContent = $derived(path === '/graph')
</script>

{#if renderRouteContent}
  {@render children()}
{:else}
  <Workspace {router} />
{/if}
