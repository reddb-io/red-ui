<script lang="ts">
  import { Kbd } from '@reddb-io/ui-kit'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import ActivityIndicator from './ActivityIndicator.svelte'
  import { Search, Sun, Moon, Network, Database, FileCode2, Shield } from 'lucide-svelte'
  import { theme } from './theme.svelte'
  import { page } from '$app/state'

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
  }

  const onQuery = $derived(page.url.pathname.startsWith('/query'))
  const onCollections = $derived(page.url.pathname === '/' || page.url.pathname.startsWith('/collections') || page.url.pathname.startsWith('/c/'))
  const onCluster = $derived(page.url.pathname.startsWith('/cluster'))
  const onSecurity = $derived(page.url.pathname.startsWith('/security'))
</script>

<header class="h-11 flex items-center justify-between px-3.5 bg-bg-1/80 backdrop-blur-md border-b border-line-1 relative z-10">
  <div class="flex items-center gap-2.5">
    <a href="/" class="font-mono font-semibold text-[13px] tracking-tight text-fg-0 no-underline hover:text-accent transition-colors">
      red<span class="text-accent mx-px">·</span>ui
    </a>
    <div class="w-px h-[18px] bg-line-2"></div>
    <ConnectDropdown />
    <div class="w-px h-[18px] bg-line-2 ml-1"></div>
    <nav class="flex items-center gap-0.5">
      <a
        href="/query"
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
        href="/collections"
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
        href="/cluster"
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
        href="/security"
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
    </nav>
  </div>

  <div class="flex items-center gap-2.5">
    <ActivityIndicator />
    <button
      type="button"
      onclick={() => theme.toggle()}
      title={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={theme.current === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      class="inline-flex items-center justify-center size-7 bg-bg-2 border border-line-2 rounded-md text-fg-2 cursor-pointer transition-colors hover:border-line-3 hover:text-fg-0"
    >
      {#if theme.current === 'dark'}
        <Sun class="size-3.5" />
      {:else}
        <Moon class="size-3.5" />
      {/if}
    </button>
    <button
      onclick={openPalette}
      class="inline-flex items-center gap-2 h-7 pl-2.5 pr-2 bg-bg-2 border border-line-2 rounded-md text-fg-2 cursor-pointer text-xs transition-colors hover:border-line-3 hover:text-fg-1"
    >
      <Search class="size-3.5 text-fg-3" />
      <span>Search or run</span>
      <span class="inline-flex gap-0.5 ml-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </button>
  </div>
</header>
