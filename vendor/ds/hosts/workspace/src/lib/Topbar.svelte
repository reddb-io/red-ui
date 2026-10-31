<script lang="ts">
  import { useWorkspace } from './workspace-context'
  import { Button, Icon, Kbd, Logo } from '@reddb-io/design-system/base'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import ActivityIndicator from './ActivityIndicator.svelte'
  import Search from '@lucide/svelte/icons/search'
  import Sun from '@lucide/svelte/icons/sun'
  import Moon from '@lucide/svelte/icons/moon'

  import { useRouter } from './router.svelte'

  const workspace = useWorkspace()
  const { theme } = workspace

  let { showConnect = true }: { showConnect?: boolean } = $props()

  const router = useRouter()

  function openPalette() {
    workspace.dispatch('red:open-palette')
  }

</script>

<header data-workspace-topbar class="flex flex-wrap items-center justify-between gap-2 p-[var(--reddb-spatial-inset-sm)] bg-elevation-base-surface border-b border-elevation-base-border relative z-10">
  <div class="flex min-w-0 flex-1 flex-wrap items-center gap-[var(--reddb-spatial-gap-md)]">
    <Logo
      layout="horizontal"
      size={16}
      on={theme.current}
      href={router.href({ view: 'collections' })}
      label="RedDB home"
      onclick={(e) => router.go({ view: 'collections' }, e)}
    />
    {#if showConnect}
      <div class="w-px h-[18px] bg-control-edge"></div>
      <ConnectDropdown />
    {/if}

  </div>

  <div class="flex items-center gap-2.5">
    <ActivityIndicator />
    <Button
      size="sm"
      type="button"
      onclick={() => theme.toggle()}
      title={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {#if theme.current === 'dark'}
        <Icon icon={Sun} size="sm" />
      {:else}
        <Icon icon={Moon} size="sm" />
      {/if}
    </Button>
    <Button
      size="sm"
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      onclick={openPalette}
    >
      <Icon icon={Search} size="sm" />
      <span>Search or run</span>
      <span class="inline-flex gap-0.5 ml-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </Button>
  </div>
</header>
