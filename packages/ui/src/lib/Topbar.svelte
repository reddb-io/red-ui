<script lang="ts">
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
  import { theme } from './theme.svelte'
  import { useRouter } from './router.svelte'

  let { showConnect = true }: { showConnect?: boolean } = $props()

  const router = useRouter()

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
  }

  const onAsk = $derived(router.view === 'ask')
  const onQuery = $derived(router.view === 'query')
  const onCollections = $derived(router.view === 'collections')
  const onCluster = $derived(router.view === 'cluster')
  const onSecurity = $derived(router.view === 'security')
  const onAnalytics = $derived(router.view === 'analytics')
  const onSettings = $derived(router.view === 'settings')
</script>

<header class="h-11 flex items-center justify-between px-3.5 bg-bg-1/80 backdrop-blur-md border-b border-line-1 relative z-10">
  <div class="flex items-center gap-2.5">
    <Logo
      layout="horizontal"
      size={16}
      on={theme.current}
      href={router.href({ view: 'collections' })}
      label="RedDB home"
      onclick={(e) => router.go({ view: 'collections' }, e)}
    />
    {#if showConnect}
      <div class="w-px h-[18px] bg-line-2"></div>
      <ConnectDropdown />
      <div class="w-px h-[18px] bg-line-2 ml-1"></div>
    {:else}
      <div class="w-px h-[18px] bg-line-2"></div>
    {/if}
    <nav class="flex items-center gap-0.5">
      <a
        href={router.href({ view: 'ask' })}
        onclick={(e) => router.go({ view: 'ask' }, e)}
        title="Ask — grounded natural-language query"
        aria-current={onAsk ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onAsk ? 'bg-bg-2 text-primary-text' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <Sparkles class="size-3.5" />
        <span>Ask</span>
      </a>
      <a
        href={router.href({ view: 'query' })}
        onclick={(e) => router.go({ view: 'query' }, e)}
        title="Query"
        aria-current={onQuery ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onQuery ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <FileCode2 class="size-3.5" />
        <span>Query</span>
      </a>
      <a
        href={router.href({ view: 'collections' })}
        onclick={(e) => router.go({ view: 'collections' }, e)}
        title="Collections"
        aria-current={onCollections ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onCollections ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <Database class="size-3.5" />
        <span>Collections</span>
      </a>
      <a
        href={router.href({ view: 'cluster' })}
        onclick={(e) => router.go({ view: 'cluster' }, e)}
        title="Cluster topology"
        aria-current={onCluster ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onCluster ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <Network class="size-3.5" />
        <span>Cluster</span>
      </a>
      <a
        href={router.href({ view: 'security' })}
        onclick={(e) => router.go({ view: 'security' }, e)}
        title="Security"
        aria-current={onSecurity ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onSecurity ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <Shield class="size-3.5" />
        <span>Security</span>
      </a>
      <a
        href={router.href({ view: 'analytics' })}
        onclick={(e) => router.go({ view: 'analytics' }, e)}
        title="Analytics"
        aria-current={onAnalytics ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onAnalytics ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <LineChart class="size-3.5" />
        <span>Analytics</span>
      </a>
      <a
        href={router.href({ view: 'settings' })}
        onclick={(e) => router.go({ view: 'settings' }, e)}
        title="Settings"
        aria-current={onSettings ? 'page' : undefined}
        class={[
          'inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-xs no-underline transition-colors',
          onSettings ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:text-fg-0 hover:bg-bg-2',
        ].join(' ')}
      >
        <Settings2 class="size-3.5" />
        <span>Settings</span>
      </a>
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
