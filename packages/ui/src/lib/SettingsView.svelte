<script lang="ts">
  // Minimal settings view — mounts the reusable `SplitView` shell from the
  // ui-kit end-to-end. The active section is component state (ADR-0001: the
  // Mountable Root owns no routing here), the nav is local to this view (no
  // global persistent sidebar), and the search affordance is wired to the
  // existing ⌘K command palette rather than re-binding ⌘K itself.
  import { SplitView, Kbd } from '@reddb-io/ui-kit'
  import { Settings2, Plug, Palette, Search, type Icon } from 'lucide-svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import { SETTINGS_SECTIONS, resolveSection } from '$lib/settings-sections'

  const icons: Record<string, typeof Icon> = {
    general: Settings2,
    connection: Plug,
    appearance: Palette,
  }

  let activeId = $state(SETTINGS_SECTIONS[0].id)
  const active = $derived(resolveSection(activeId))

  // Reuse the global command palette as the search surface — the same ⌘K idiom
  // the topbar uses, so Esc-to-close comes for free from the palette overlay.
  function openPalette() {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }),
    )
  }
</script>

<SplitView searchShortcut={null}>
  {#snippet search()}
    <button
      type="button"
      onclick={openPalette}
      class="flex h-7 w-full items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-2.5 text-xs text-fg-2 transition-colors hover:border-line-3 hover:text-fg-1"
    >
      <Search class="size-3.5 text-fg-3" />
      <span class="flex-1 text-left">Search settings</span>
      <span class="inline-flex gap-0.5"><Kbd>⌘</Kbd><Kbd>K</Kbd></span>
    </button>
  {/snippet}

  {#snippet nav()}
    <nav class="grid gap-0.5 p-2">
      {#each SETTINGS_SECTIONS as section (section.id)}
        {@const Icon = icons[section.id] ?? Settings2}
        {@const isActive = section.id === active.id}
        <button
          type="button"
          onclick={() => (activeId = section.id)}
          aria-current={isActive ? 'page' : undefined}
          class={[
            'inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors',
            isActive ? 'bg-bg-2 text-fg-0' : 'text-fg-2 hover:bg-bg-2 hover:text-fg-0',
          ].join(' ')}
        >
          <Icon class="size-3.5 shrink-0" />
          <span class="truncate">{section.label}</span>
        </button>
      {/each}
    </nav>
  {/snippet}

  {#snippet footer()}
    <div class="px-3 py-2.5 text-[11px] text-fg-3">
      Settings are local to this view.
    </div>
  {/snippet}

  {#snippet content()}
    <div class="p-6">
      <PageHeader eyebrow="Settings" title={active.label} subtitle={active.blurb} />
      <p class="max-w-prose text-[13px] leading-relaxed text-fg-1">{active.body}</p>
    </div>
  {/snippet}
</SplitView>
