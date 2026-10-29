<script lang="ts">
  import { page } from '$app/state'
  import { base } from '$app/paths'
  import { Button } from '@reddb-io/design-system/base'
  import { OutcomeScreen } from '@reddb-io/design-system/app'
  import { accessLocked, maintenance, pageMissing } from '@reddb-io/design-system/base/illustrations'

  const missing = $derived(page.status === 404)
  const denied = $derived(page.status === 403)
  const title = $derived(missing ? 'Page not found' : denied ? 'Access restricted' : 'This page is unavailable')
</script>

<svelte:head>
  <title>{page.status} · {title} · RedDB</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<main>
  <OutcomeScreen outcome="error" {title} note={String(page.status)} illustration={missing ? pageMissing : denied ? accessLocked : maintenance}
    description={missing ? 'This address does not point to a RedDB workspace page. Return to your collections to continue.' : denied ? 'This page requires access that your current session does not have. Return to the workspace to review your connection.' : 'The page could not be displayed. You can retry or return to your collections.'}>
    {#snippet actions()}
      <Button href={`${base}/collections`} variant="primary">Back to workspace</Button>
      {#if !missing && !denied}<Button onclick={() => window.location.reload()}>Try again</Button>{/if}
    {/snippet}
  </OutcomeScreen>
</main>
