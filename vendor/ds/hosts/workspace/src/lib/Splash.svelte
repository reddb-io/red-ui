<script lang="ts">
  import { onMount } from 'svelte'
  import { LoadingIndicator } from '@reddb-io/design-system/base'
  let { onDone, contained = false }: { onDone?: () => void; contained?: boolean } = $props()
  let visible = $state(true)
  onMount(() => {
    // Yield one paint while the workspace mounts; no artificial branding delay.
    const frame = requestAnimationFrame(() => { visible = false; onDone?.() })
    return () => cancelAnimationFrame(frame)
  })
</script>

{#if visible}
  <div class="inset-0 z-[9999] grid place-items-center bg-background" class:fixed={!contained} class:absolute={contained}>
    <LoadingIndicator label="Opening workspace" />
  </div>
{/if}
