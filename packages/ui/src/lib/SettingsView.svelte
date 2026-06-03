<script lang="ts">
  // Settings view — mounts the reusable `SplitView` shell from the ui-kit and
  // composes it from the kit's settings primitives (`NavItem`, `SectionHeading`,
  // `Pill`, `ListRow`). The active section is component state (ADR-0001: the
  // Mountable Root owns no routing here), the nav is local to this view (no
  // global persistent sidebar), and the search affordance is wired to the
  // existing ⌘K command palette rather than re-binding ⌘K itself.
  import {
    SplitView,
    NavItem,
    SectionHeading,
    Pill,
    ListRow,
    Button,
    Kbd,
  } from '@reddb-io/ui-kit'
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
        <NavItem
          label={section.label}
          active={section.id === active.id}
          onclick={() => (activeId = section.id)}
        >
          {#snippet icon()}<Icon class="size-3.5" />{/snippet}
        </NavItem>
      {/each}
    </nav>
  {/snippet}

  {#snippet footer()}
    <div class="px-3 py-2.5 text-[11px] text-fg-3">
      Settings are local to this view.
    </div>
  {/snippet}

  {#snippet content()}
    {@const Icon = icons[active.id] ?? Settings2}
    <div class="p-6">
      <PageHeader eyebrow="Settings" title={active.label} subtitle={active.blurb} />

      <section class="mb-6">
        <SectionHeading title={active.label} class="mb-2">
          {#snippet icon()}<Icon class="size-3.5" />{/snippet}
          {#snippet meta()}<Pill>{active.rows.length}</Pill>{/snippet}
        </SectionHeading>

        <div class="divide-y divide-line-1 overflow-hidden rounded-lg border border-line-1 bg-bg-1">
          {#each active.rows as row (row.title)}
            <ListRow title={row.title} description={row.description} hint={row.hint} wide={row.wide}>
              {#snippet action()}
                {#if row.wide}
                  <input
                    type="text"
                    value={row.hint ?? ''}
                    spellcheck="false"
                    class="h-7 w-full rounded-md border border-line-2 bg-bg-2 px-2.5 font-mono text-[12px] text-fg-1 focus-visible:border-line-3 focus-visible:outline-none"
                  />
                {:else if row.status}
                  <Pill tone={row.status.tone}>{row.status.label}</Pill>
                {:else}
                  <Button size="sm">Edit</Button>
                {/if}
              {/snippet}
            </ListRow>
          {/each}
        </div>
      </section>

      <p class="max-w-prose text-[13px] leading-relaxed text-fg-2">{active.body}</p>
    </div>
  {/snippet}
</SplitView>
