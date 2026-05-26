<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import MasterPasswordDialog from '$lib/MasterPasswordDialog.svelte'
  import { connection } from '$lib/connections.svelte'
  import { secureStore } from '$lib/secureStore.svelte'

  let { children } = $props()
  let booted = $state(false)

  onMount(() => {
    connection.refresh()
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
  <div class="app grid grid-rows-[44px_1fr] h-screen">
    <Topbar />
    <main class="relative overflow-hidden z-[1]">
      {@render children?.()}
    </main>
    <CommandPalette />
    <MasterPasswordDialog />
  </div>
{/if}
