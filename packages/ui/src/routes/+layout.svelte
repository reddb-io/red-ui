<script lang="ts">
  import '../app.css'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'

  let { children } = $props()
  let booted = $state(false)
</script>

{#if !booted}
  <Splash onDone={() => (booted = true)} />
{/if}

<div class="app" class:visible={booted}>
  <Topbar />
  <main>
    {@render children?.()}
  </main>
  <CommandPalette />
</div>

<style>
  .app {
    display: grid;
    grid-template-rows: 44px 1fr;
    height: 100vh;
    opacity: 0;
    transition: opacity 320ms var(--ease-out) 80ms;
  }
  .app.visible { opacity: 1; }
  main {
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
</style>
