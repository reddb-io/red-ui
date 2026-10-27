<script lang="ts">
  import Workspace from '../Workspace.svelte'
  import ErrorBoundary from '../ErrorBoundary.svelte'
  import type { WorkspaceRuntime } from '../workspace-runtime.svelte'
  import type { Theme } from '../theme.svelte'

  let {
    runtime,
    label,
    portalTarget,
    shadowHost,
    initialRoute,
    initialTheme = 'dark',
  }: {
    runtime: WorkspaceRuntime
    label?: string
    portalTarget: HTMLElement
    shadowHost: HTMLElement
    initialRoute?: string
    initialTheme?: Theme
  } = $props()
</script>

  <!-- Black-screen shield (#126): keep an embed render crash inside the boundary
       rather than blanking the host's mount point. -->
  <ErrorBoundary>
    <Workspace
      {runtime}
      {label}
      {portalTarget}
      {initialRoute}
      showConnect={false}
      themeTarget={shadowHost}
      persistTheme={false}
      {initialTheme}
    />
  </ErrorBoundary>
