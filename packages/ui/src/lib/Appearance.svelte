<script lang="ts">
  // Appearance section (#75). Renders each registered skin as a live preview
  // card — a mini-mockup painted with that skin's *own* derived tokens — and
  // applies the skin on click. Selection persists across reloads via the skin
  // store. Dark-only: there is no light/system switch here.
  import { Check } from 'lucide-svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import { SKINS, skinToCssVars, type Skin } from '$lib/skins/skins'
  import { skins } from '$lib/skins/skins.svelte'

  // Each preview is painted with the skin's own custom properties so the card
  // is a faithful, self-contained swatch of the palette — `color-mix` ramps
  // resolve in the browser exactly as they would once applied.
  function previewStyle(skin: Skin): string {
    return Object.entries(skinToCssVars(skin))
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ')
  }

  const selected = $derived(skins.current.name)
</script>

<div class="h-full overflow-auto bg-bg-0 p-6 text-fg-1">
  <PageHeader
    eyebrow="Settings"
    title="Appearance"
    subtitle="Pick a skin. Surfaces are derived from a single seed; the accent stays surgical. Dark only."
  />

  <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-w-4xl">
    {#each SKINS as skin (skin.name)}
      {@const active = skin.name === selected}
      <button
        type="button"
        onclick={() => skins.select(skin.name)}
        aria-pressed={active}
        class="group text-left rounded-lg border bg-bg-1 p-3 transition-colors {active
          ? 'border-accent'
          : 'border-line-2 hover:border-line-3'}"
      >
        <!-- Mini-mockup, painted in the skin's own tokens -->
        <div
          class="rounded-md overflow-hidden border border-line-1"
          style={previewStyle(skin)}
        >
          <div class="bg-bg-0 p-3">
            <!-- faux topbar -->
            <div class="flex items-center gap-1.5 mb-2.5">
              <span class="size-2 rounded-full" style="background: var(--color-accent)"></span>
              <span class="h-1.5 w-12 rounded-full bg-bg-3"></span>
              <span class="ml-auto h-1.5 w-6 rounded-full bg-bg-2"></span>
            </div>
            <!-- faux card with strips -->
            <div class="rounded-md bg-bg-1 border border-line-2 p-2.5">
              <div class="h-1.5 w-2/3 rounded-full bg-fg-2 mb-2"></div>
              <div class="h-1.5 w-full rounded-full bg-bg-3 mb-1.5"></div>
              <div class="h-1.5 w-4/5 rounded-full bg-bg-3 mb-2.5"></div>
              <div class="flex items-center gap-1.5">
                <span
                  class="h-4 w-12 rounded"
                  style="background: var(--color-accent)"
                ></span>
                <span class="h-4 w-8 rounded bg-bg-2 border border-line-2"></span>
              </div>
            </div>
          </div>
          <!-- surface ramp strip: bg-0..bg-3 -->
          <div class="flex h-2.5">
            <span class="flex-1 bg-bg-0"></span>
            <span class="flex-1 bg-bg-1"></span>
            <span class="flex-1 bg-bg-2"></span>
            <span class="flex-1 bg-bg-3"></span>
          </div>
        </div>

        <div class="flex items-center gap-2 mt-3">
          <span class="type-h2 text-fg-0">{skin.label}</span>
          {#if active}
            <span
              class="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-accent"
            >
              <Check class="size-3" /> Active
            </span>
          {/if}
        </div>
        <p class="type-caption m-0 mt-1">{skin.description}</p>
      </button>
    {/each}
  </div>
</div>
