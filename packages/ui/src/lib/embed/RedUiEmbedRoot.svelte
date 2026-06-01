<script lang="ts">
  import { BitsConfig } from 'bits-ui'
  import Workspace from '../Workspace.svelte'
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
  <Workspace
    {connectionProvider}
    {initialRoute}
    showConnect={false}
    themeTarget={shadowHost}
    persistTheme={false}
    {initialTheme}
  />
</BitsConfig>
