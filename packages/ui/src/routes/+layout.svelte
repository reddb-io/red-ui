<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Connect from '$lib/Connect.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import { connection } from '$lib/connections.svelte'

  let { children } = $props()
  let booted = $state(false)

  // After splash, immediately try the remembered connection in the background.
  // If it works, we never show the Connect screen. If it doesn't, the user
  // sees Connect with the remembered URL pre-filled.
  onMount(() => {
    connection.refresh()
  })
</script>

{#if !booted}
  <Splash onDone={() => (booted = true)} />
{:else if !connection.connected}
  <Connect />
{:else}
  <div class="app grid grid-rows-[44px_1fr] h-screen">
    <Topbar />
    <main class="relative overflow-hidden z-[1]">
      {@render children?.()}
    </main>
    <CommandPalette />
  </div>
{/if}
