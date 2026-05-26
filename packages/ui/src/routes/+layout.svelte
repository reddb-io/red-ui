<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import StatusBar from '$lib/StatusBar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import ShortcutOverlay from '$lib/ShortcutOverlay.svelte'
  import MasterPasswordDialog from '$lib/MasterPasswordDialog.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'

  let { children } = $props()
  let booted = $state(false)

  const REFRESH_MS = 5000

  onMount(() => {
    connection.refresh()
    const id = setInterval(() => connection.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  })

  // Once the secure store binds (Tauri at boot / web after unlock), hydrate
  // history URLs from the encrypted store so the dropdown can reconnect.
  $effect(() => {
    if (secureStore.store) connection.hydrateUrls()
  })
</script>

{#if !booted}
  <Splash onDone={() => (booted = true)} />
{:else}
  <div class="app grid grid-rows-[44px_32px_1fr] h-screen">
    <Topbar />
    <StatusBar />
    <main class="relative overflow-hidden z-[1]">
      {@render children?.()}
    </main>
    <CommandPalette />
    <ShortcutOverlay />
    <MasterPasswordDialog />
  </div>
{/if}
