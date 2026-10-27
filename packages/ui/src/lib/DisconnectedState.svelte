<script lang="ts">
  import { Button } from '@reddb-io/design-system/base'
  import { connectionLost, integrationEmpty, sessionExpired } from '@reddb-io/design-system/base/illustrations'
  import EmptyState from './EmptyState.svelte'
  import { connection } from './connections.svelte'
  import { secureStore } from './secureStore.svelte'

  let { message = 'Connect to a reddb instance to browse collections and run queries.' }: { message?: string } = $props()
  const interrupted = $derived(Boolean(connection.probe.error))
  const signInRequired = $derived(connection.probe.error?.includes('HTTP 401') ?? false)
</script>

<EmptyState
  illustration={signInRequired ? sessionExpired : interrupted ? connectionLost : integrationEmpty}
  illustrationSize="lg"
  title={signInRequired ? 'Sign in to your database' : interrupted ? 'Connection interrupted' : 'Connect to your database'}
  message={secureStore.surface === 'embedded' ? 'Restore the database connection in the host application to continue.' : signInRequired ? 'This database requires authentication. Review your connection and sign in to continue.' : message}
>
  {#snippet actions()}
    {#if secureStore.surface !== 'embedded'}
      <Button variant="primary" onclick={() => window.dispatchEvent(new CustomEvent('red:open-connect'))}>
        {signInRequired ? 'Sign in' : interrupted ? 'Review connection' : 'Connect to database'}
      </Button>
    {/if}
  {/snippet}
</EmptyState>
