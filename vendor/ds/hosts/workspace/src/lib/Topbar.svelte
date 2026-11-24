<script lang="ts">
  import { useWorkspace } from './workspace-context'
  import { Button, Icon, Kbd, Logo } from '@reddb-io/design-system/base'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import StatusBar from './StatusBar.svelte'
  import Search from '@lucide/svelte/icons/search'
  import Sun from '@lucide/svelte/icons/sun'
  import Moon from '@lucide/svelte/icons/moon'

  import { useRouter } from './router.svelte'

  const workspace = useWorkspace()
  const { theme } = workspace

  let { showConnect = true, showCommands = true, showStatus = false }: {
    showConnect?: boolean
    showCommands?: boolean
    /** Show the connection's state inline; the entered workspace sets it. */
    showStatus?: boolean
  } = $props()

  const router = useRouter()

  function openPalette() {
    workspace.dispatch('red:open-palette')
  }

</script>

<header data-workspace-topbar class="flex flex-wrap items-center justify-between gap-2 p-[var(--reddb-spatial-inset-sm)] bg-elevation-base-surface border-b border-elevation-base-border relative z-10">
  <!-- One row on a phone too: the connection menu takes the room that is left
       and truncates, and the state beside it wraps to a second row only when it
       has something to say that does not fit. -->
  <div class="flex min-w-0 flex-[1_1_12rem] items-center gap-[var(--reddb-spatial-gap-md)]">
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
  {#if showStatus}<StatusBar />{/if}

  <div class="ms-auto flex shrink-0 items-center gap-[var(--reddb-spatial-gap-sm)]">
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
    {#if showCommands}
    <Button
      size="sm"
      aria-haspopup="dialog"
      aria-keyshortcuts="Meta+K Control+K"
      onclick={openPalette}
    >
      <Icon icon={Search} size="sm" />
      <!-- A phone has room for the glyph only, and no keyboard to hint at. The
           label stays in the DOM so the button's name is always its content. -->
      <span class="max-sm:sr-only">Search or run</span>
      <span class="ml-1 hidden gap-0.5 md:inline-flex"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </Button>
    {/if}
  </div>
</header>
