<script lang="ts">
  import { BitsConfig } from 'bits-ui'
  import Workspace from '../Workspace.svelte'
  import ErrorBoundary from '../ErrorBoundary.svelte'
  import type { ConnectionProvider } from '../reddb'
  import type { Theme } from '../theme.svelte'

  let {
    connectionProvider,
    portalTarget,
    shadowHost,
    initialRoute,
    initialTheme = 'dark',
  }: {
    connectionProvider: ConnectionProvider
    portalTarget: HTMLElement
    shadowHost: HTMLElement
    initialRoute?: string
    initialTheme?: Theme
  } = $props()
</script>

<BitsConfig defaultPortalTo={portalTarget}>
  <!-- Black-screen shield (#126): keep an embed render crash inside the boundary
       rather than blanking the host's mount point. -->
  <ErrorBoundary>
    <Workspace
      {connectionProvider}
      {initialRoute}
      showConnect={false}
      themeTarget={shadowHost}
      persistTheme={false}
      {initialTheme}
    />
  </ErrorBoundary>
</BitsConfig>
