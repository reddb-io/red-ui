<script lang="ts">
  import { Alert, Button, Heading, LoadingIndicator, StateIllustration } from '@reddb-io/design-system/base'
  import { integrationEmpty } from '@reddb-io/design-system/base/illustrations'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import DisconnectedState from './DisconnectedState.svelte'
  import { useWorkspace } from './workspace-context'

  let { restored, resolved, showConnect, onopendrafts }: {
    restored: boolean
    resolved: boolean
    showConnect: boolean
    onopendrafts: () => void
  } = $props()
  const workspace = useWorkspace()
  const hasDrafts = $derived(workspace.tabs.tabs.length > 0)
</script>

<svelte:element this={workspace.persistenceKey === 'default' ? 'main' : 'div'} data-workspace-entry class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto p-[var(--reddb-spatial-section-inset)]">
  {#if !restored || !resolved || workspace.connection.connecting || workspace.connection.connected}
    <div role="status" aria-live="polite" class="grid justify-items-center gap-[var(--reddb-spatial-layout-gap-md)]">
      <LoadingIndicator label={!restored ? 'Checking this device…' : 'Opening your connection…'} />
      <p class="text-body text-ink-muted">{!restored ? 'Looking for saved connections and workspace documents.' : 'Your workspace will open when the connection is ready.'}</p>
    </div>
  {:else if workspace.injected || !showConnect}
    <DisconnectedState showConnect={false} message="Restore the database connection in the host application to continue." />
  {:else}
    <div class="@container flex w-full max-w-[var(--reddb-container-prose)] flex-col gap-[var(--reddb-spatial-layout-gap-lg)]">
      <div class="flex flex-col items-center gap-[var(--reddb-spatial-layout-gap-md)] text-center @sm:flex-row @sm:text-left">
        <StateIllustration art={integrationEmpty} size="sm" />
        <div class="min-w-0">
          <Heading level={1} role="title">Connect to your database</Heading>
          <p class="text-body text-ink-muted">Choose a saved connection or enter a server address to browse collections and run queries.</p>
        </div>
      </div>
      {#if workspace.persistenceStatus.state === 'error'}
        <Alert tone="warning" title="Saved workspace recovery needs attention">Your previous data was kept. You can connect now; keep this page open to preserve any new drafts.</Alert>
      {/if}
      <ConnectDropdown presentation="inline" />
      {#if hasDrafts}
        <div class="flex flex-wrap items-center justify-between gap-[var(--reddb-spatial-gap-md)] border-t border-elevation-base-border pt-[var(--reddb-spatial-inset-lg)]">
          <p class="text-body text-ink-muted">Your saved documents are available on this device.</p>
          <Button onclick={onopendrafts}>Open saved workspace offline</Button>
        </div>
      {/if}
    </div>
  {/if}
</svelte:element>
