<script lang="ts">
  import { onMount } from 'svelte'
  import { mountShadowDomSpike, type ShadowDomSpikeMount } from '$lib/shadow-dom-spike/mount-shadow-dom-spike'

  let host: HTMLDivElement
  let mounted: ShadowDomSpikeMount | null = null

  onMount(() => {
    mounted = mountShadowDomSpike(host)
    return () => {
      mounted?.destroy()
      mounted = null
    }
  })
</script>

<svelte:head>
  <title>Shadow DOM spike</title>
</svelte:head>

<main class="hostile-host min-h-screen bg-white p-6 text-black">
  <div class="mx-auto max-w-6xl">
    <div class="mb-4 rounded border-4 border-lime-500 bg-yellow-200 p-3 font-serif text-[18px] text-purple-700">
      Host document styles are intentionally incompatible with red-ui.
    </div>

    <div bind:this={host} data-red-ui-shadow-host class="rounded border border-zinc-300 bg-white shadow-xl"></div>
  </div>
</main>

<style>
  :global(.hostile-host button) {
    border: 6px dotted lime !important;
    background: yellow !important;
    color: purple !important;
    font-family: serif !important;
  }

  :global(.hostile-host input) {
    border: 6px dotted lime !important;
    background: yellow !important;
    color: purple !important;
    font-family: serif !important;
  }
</style>
