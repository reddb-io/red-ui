<script lang="ts">
  import { page } from '$app/state'
  import { base } from '$app/paths'
  import { Button, StateIllustration } from '@reddb-io/design-system/base'
  import { accessLocked, maintenance, pageMissing } from '@reddb-io/design-system/base/illustrations'

  const missing = $derived(page.status === 404)
  const denied = $derived(page.status === 403)
  const title = $derived(missing ? 'Page not found' : denied ? 'Access restricted' : 'This page is unavailable')
</script>

<svelte:head>
  <title>{page.status} · {title} · RedDB</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main class="grid min-h-screen place-items-center bg-bg-0 p-6 text-fg-0">
  <section aria-labelledby="recovery-title" class="flex w-full max-w-xl flex-col items-center gap-5 text-center">
    <StateIllustration art={missing ? pageMissing : denied ? accessLocked : maintenance} size="lg" />
    <p class="m-0 font-mono text-xs text-fg-2">{page.status}</p>
    <h1 id="recovery-title" class="type-h1 m-0">{title}</h1>
    <p class="m-0 max-w-prose text-sm text-fg-2">
      {missing ? 'This address does not point to a RedDB workspace page. Return to your collections to continue.' : denied ? 'This page requires access that your current session does not have. Return to the workspace to review your connection.' : 'The page could not be displayed. You can retry or return to your collections.'}
    </p>
    <div class="flex flex-wrap justify-center gap-3">
      <Button href={`${base}/collections`} variant="primary">Back to workspace</Button>
      {#if !missing && !denied}<Button onclick={() => window.location.reload()}>Try again</Button>{/if}
    </div>
  </section>
</main>
