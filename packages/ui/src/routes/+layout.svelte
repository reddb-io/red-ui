<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import { connection } from '$lib/connections.svelte'

  let { children } = $props()
  let booted = $state(false)

  onMount(() => {
    connection.refresh()
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
  </div>
{/if}
