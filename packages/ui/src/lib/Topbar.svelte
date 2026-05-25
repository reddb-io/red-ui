<script lang="ts">
  import { Badge, Kbd } from '@red-ui/ui-kit'
  import { auth } from './auth.svelte'
  import { goto } from '$app/navigation'
  import ConnectionSwitcher from './ConnectionSwitcher.svelte'
  import { Search } from 'lucide-svelte'

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
    <ConnectionSwitcher />
  </div>

  <div class="flex items-center gap-2.5">
    <button
      onclick={openPalette}
      class="inline-flex items-center gap-2 h-7 pl-2.5 pr-2 bg-bg-2 border border-line-2 rounded-md text-fg-2 cursor-pointer text-xs transition-colors hover:border-line-3 hover:text-fg-1"
    >
      <Search class="size-3.5 text-fg-3" />
      <span>Search or run</span>
      <span class="inline-flex gap-0.5 ml-1"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </button>

    <div class="w-px h-[18px] bg-line-2"></div>

    <button
      onclick={() => goto('/whoami')}
      title="View my permissions"
      class="flex items-center gap-2 bg-transparent border-0 px-1.5 py-1 rounded-md cursor-pointer hover:bg-bg-2 transition-colors"
    >
      <span class="text-xs text-fg-1 font-mono">{auth.identity.name}</span>
      <Badge tone="accent">{auth.identity.role}</Badge>
    </button>
  </div>
</header>
