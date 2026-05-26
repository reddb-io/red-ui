<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import StatusBar from '$lib/StatusBar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import { connection } from '$lib/connections.svelte'

  let { children } = $props()
  let booted = $state(false)

  const REFRESH_MS = 5000

  onMount(() => {
    connection.refresh()
    const id = setInterval(() => connection.refresh(), REFRESH_MS)
    return () => clearInterval(id)
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
  </div>
{/if}
