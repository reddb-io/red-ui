<script lang="ts">
  import { Kbd } from '@red-ui/ui-kit'
  import ConnectDropdown from './ConnectDropdown.svelte'
  import { Search, Sun, Moon } from 'lucide-svelte'
  import { theme } from './theme.svelte'

  function openPalette() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }))
  }
</script>

<header class="h-11 flex items-center justify-between px-3.5 bg-bg-1/80 backdrop-blur-md border-b border-line-1 relative z-10">
  <div class="flex items-center gap-2.5">
    <div class="font-mono font-semibold text-[13px] tracking-tight text-fg-0">
      red<span class="text-accent mx-px">·</span>ui
    </div>
    <div class="w-px h-[18px] bg-line-2"></div>
    <ConnectDropdown />
  </div>

  <div class="flex items-center gap-2.5">
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
