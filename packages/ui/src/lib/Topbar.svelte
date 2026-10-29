<script lang="ts">
  import { NavItem } from '@reddb-io/design-system/app'
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  import { Button, Icon, Kbd, Logo } from '@reddb-io/design-system/base'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import ActivityIndicator from './ActivityIndicator.svelte'
  import Search from '@lucide/svelte/icons/search'
  import Sun from '@lucide/svelte/icons/sun'
  import Moon from '@lucide/svelte/icons/moon'
  import Network from '@lucide/svelte/icons/network'
  import Database from '@lucide/svelte/icons/database'
  import FileCode2 from '@lucide/svelte/icons/file-code-2'
  import Shield from '@lucide/svelte/icons/shield'
  import Settings2 from '@lucide/svelte/icons/settings-2'
  import LineChart from '@lucide/svelte/icons/line-chart'
  import Sparkles from '@lucide/svelte/icons/sparkles'

  import { useRouter } from './router.svelte'

  const workspace = useWorkspace()
  const { theme } = workspace

  let { showConnect = true, label = 'Workspace' }: { showConnect?: boolean; label?: string } = $props()

  const router = useRouter()

  function openPalette() {
    workspace.dispatch('red:open-palette')
  }

  const onAsk = $derived(router.view === 'ask')
  const onQuery = $derived(router.view === 'query')
  const onCollections = $derived(router.view === 'collections')
  const onCluster = $derived(router.view === 'cluster')
  const onSecurity = $derived(router.view === 'security')
  const onAnalytics = $derived(router.view === 'analytics')
  const onSettings = $derived(router.view === 'settings')
</script>

<header class="flex flex-wrap items-center justify-between gap-2 p-[var(--reddb-spatial-inset-sm)] bg-elevation-base-surface border-b border-muted relative z-10">
  <div class="flex min-w-0 flex-1 basis-full flex-wrap items-center gap-2.5 sm:basis-0 sm:flex-nowrap">
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
      <div class="w-px h-[18px] bg-control-edge ml-1"></div>
    {:else}
      <div class="w-px h-[18px] bg-control-edge"></div>
    {/if}
    <nav aria-label={`${label} navigation`} class="flex min-w-0 basis-full items-center gap-[var(--reddb-spatial-gap-sm)] overflow-x-auto sm:basis-auto">
      <NavItem href={router.href({ view: 'ask' })} label="Ask" current={onAsk}
        onclick={(event) => router.go({ view: 'ask' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={Sparkles} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'query' })} label="Query" current={onQuery}
        onclick={(event) => router.go({ view: 'query' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={FileCode2} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'collections' })} label="Collections" current={onCollections}
        onclick={(event) => router.go({ view: 'collections' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={Database} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'cluster' })} label="Cluster" current={onCluster}
        onclick={(event) => router.go({ view: 'cluster' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={Network} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'security' })} label="Security" current={onSecurity}
        onclick={(event) => router.go({ view: 'security' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={Shield} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'analytics' })} label="Analytics" current={onAnalytics}
        onclick={(event) => router.go({ view: 'analytics' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={LineChart} />{/snippet}
      </NavItem>
      <NavItem href={router.href({ view: 'settings' })} label="Settings" current={onSettings}
        onclick={(event) => router.go({ view: 'settings' }, event)} class="w-auto shrink-0">
        {#snippet icon()}<Icon icon={Settings2} />{/snippet}
      </NavItem>
    </nav>
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
