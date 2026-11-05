<script lang="ts">
  import WorkspaceNavigation from './WorkspaceNavigation.svelte'
  import CollectionsView from './CollectionsView.svelte'
  import ClusterView from './ClusterView.svelte'
  import AskView from './AskView.svelte'
  import SecurityView from './SecurityView.svelte'
  import SettingsView from './SettingsView.svelte'
  import Appearance from './Appearance.svelte'
  import { useWorkspace } from './workspace-context'
  import { useRouter } from './router.svelte'
  let { label }: { label: string } = $props()
  const workspace = useWorkspace()
  const router = useRouter()
</script>

    <div data-workspace-body class="flex min-h-0 min-w-0 overflow-hidden">
    <WorkspaceNavigation {label} />
    <svelte:element this={workspace.persistenceKey === 'default' ? 'main' : 'div'} class="relative min-h-0 min-w-0 flex-1 overflow-hidden z-[1]">
      {#if router.view === 'ask'}
        <AskView />
      {:else if router.view === 'cluster'}
        <ClusterView />
      {:else if router.view === 'security'}
        <SecurityView />
      {:else if router.view === 'analytics'}
        <!-- Lazy: LayerChart + d3 are heavy, so the charting bundle only
             loads when the user actually opens Analytics. -->
        {#await import('./AnalyticsView.svelte')}
          <div class="flex h-full items-center justify-center font-mono text-[12px] text-ink-muted">loading analytics…</div>
        {:then { default: AnalyticsView }}
          <AnalyticsView />
        {/await}
      {:else if router.view === 'settings'}
        <SettingsView />
      {:else if router.view === 'appearance'}
        <Appearance />
      {:else}
        <CollectionsView />
      {/if}
    </svelte:element>
    </div>
