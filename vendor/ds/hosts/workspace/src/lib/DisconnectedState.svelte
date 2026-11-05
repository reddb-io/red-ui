<script lang="ts">
  import { useWorkspace } from './workspace-context'
  import { Button, LoadingIndicator } from '@reddb-io/design-system/base'
  import { connectionLost, integrationEmpty, sessionExpired } from '@reddb-io/design-system/base/illustrations'
  import EmptyState from './EmptyState.svelte'

  const workspace = useWorkspace()
  const { connection, secureStore } = workspace

  let { message = 'Connect to a reddb instance to browse collections and run queries.', showConnect = true }: { message?: string; showConnect?: boolean } = $props()
  const interrupted = $derived(Boolean(connection.probe.error))
  const signInRequired = $derived(connection.probe.error?.includes('HTTP 401') ?? false)
</script>

{#if connection.connecting}
  <div class="grid place-items-center gap-[var(--reddb-spatial-gap-md)] p-[var(--reddb-spatial-inset-lg)]">
    <LoadingIndicator label="Connecting to your database" />
    <p class="text-caption text-ink-muted">{workspace.loading.current?.label ?? 'Opening connection'}</p>
  </div>
{:else}
  <EmptyState
    illustration={signInRequired ? sessionExpired : interrupted ? connectionLost : integrationEmpty}
    illustrationSize="lg"
    title={signInRequired ? 'Sign in to your database' : interrupted ? 'Connection interrupted' : 'Connect to your database'}
    message={secureStore.surface === 'embedded' ? 'Restore the database connection in the host application to continue.' : signInRequired ? 'This database requires authentication. Review your connection and sign in to continue.' : message}
  >
    {#snippet actions()}
      {#if showConnect && secureStore.surface !== 'embedded'}
        <Button variant="primary" onclick={() => workspace.dispatch('red:open-connect')}>
          {signInRequired ? 'Sign in' : interrupted ? 'Review connection' : 'Connect to database'}
        </Button>
      {/if}
    {/snippet}
  </EmptyState>
{/if}
