<script lang="ts" module>
  // Re-export the pure helpers so consumers can reach them from the same entry
  // as the component (e.g. to share the breakpoint or the shortcut predicate).
  export { splitViewGridClass, isSearchShortcut, SPLIT_VIEW_BREAKPOINT_REM } from './split-view'
</script>

<script lang="ts">
  // A presentational two-pane shell — `nav | content` at `13rem | minmax(0,1fr)`,
  // collapsing to a single column on a narrow *container* (not just viewport).
  // It owns no routing and no domain concepts (ADR-0001): which section is
  // active is the host's business, driven through these slots. Styling stays in
  // Tailwind class strings and every region exposes a `*Class` override hook.
  import type { Snippet } from 'svelte'
  import { onMount, tick } from 'svelte'
  import { isSearchShortcut, splitViewGridClass } from './split-view'

  interface Props {
    /** Left navigation pane content. */
    nav?: Snippet
    /** Right content pane. */
    content?: Snippet
    /** Pinned to the bottom of the nav pane. */
    footer?: Snippet
    /** Focusable search affordance — inline at the top of the nav by default. */
    search?: Snippet
    /**
     * Force a single column (`true`) or two columns (`false`). Omit for the
     * responsive default (collapses below the container breakpoint).
     */
    collapsed?: boolean
    /** Render the search slot as a centered overlay instead of inline. */
    searchOverlay?: boolean
    /** Bindable open state for the search overlay. */
    searchOpen?: boolean
    /**
     * Predicate for the keyboard idiom that focuses (inline) or toggles
     * (overlay) the search. Defaults to ⌘K / Ctrl+K. Pass `null` to disable —
     * e.g. when the host already owns ⌘K for a global command palette.
     */
    searchShortcut?: ((e: KeyboardEvent) => boolean) | null
    /** Styling hooks. */
    class?: string
    navClass?: string
    contentClass?: string
    footerClass?: string
    searchClass?: string
  }

  let {
    nav,
    content,
    footer,
    search,
    collapsed,
    searchOverlay = false,
    searchOpen = $bindable(false),
    searchShortcut = isSearchShortcut,
    class: klass = '',
    navClass = '',
    contentClass = '',
    footerClass = '',
    searchClass = '',
  }: Props = $props()

  const gridClass = $derived(splitViewGridClass(collapsed))

  let searchHost = $state<HTMLElement>()
  let overlayHost = $state<HTMLElement>()

  function focusFirst(host: HTMLElement | undefined) {
    const el = host?.querySelector<HTMLElement>(
      'input, textarea, select, button, [href], [tabindex]:not([tabindex="-1"])',
    )
    el?.focus()
  }

  async function activateSearch() {
    if (searchOverlay) {
      searchOpen = true
      await tick()
      focusFirst(overlayHost)
    } else {
      focusFirst(searchHost)
    }
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if (searchShortcut && searchShortcut(e)) {
        e.preventDefault()
        void activateSearch()
        return
      }
      // Esc closes the overlay regardless of whether the shortcut is enabled.
      if (searchOverlay && searchOpen && e.key === 'Escape') {
        e.preventDefault()
        searchOpen = false
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
</script>

<div class="@container relative h-full min-h-0 w-full {klass}">
  <div class="grid h-full min-h-0 {gridClass}">
    <aside
      class="flex min-h-0 flex-col border-line-1 bg-bg-1 border-b @min-[52rem]:border-b-0 @min-[52rem]:border-r {navClass}"
    >
      {#if search && !searchOverlay}
        <div bind:this={searchHost} class="shrink-0 border-b border-line-1 p-2 {searchClass}">
          {@render search()}
        </div>
      {/if}
      <div class="min-h-0 flex-1 overflow-y-auto">
        {@render nav?.()}
      </div>
      {#if footer}
        <div class="mt-auto shrink-0 border-t border-line-1 {footerClass}">
          {@render footer()}
        </div>
      {/if}
    </aside>

    <section class="min-h-0 min-w-0 overflow-auto bg-bg-0 {contentClass}">
      {@render content?.()}
    </section>
  </div>

  {#if search && searchOverlay && searchOpen}
    <div
      class="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm"
      role="presentation"
      onclick={() => (searchOpen = false)}
    ></div>
    <div
      bind:this={overlayHost}
      class="absolute left-1/2 top-[15%] z-50 w-[min(36rem,92%)] -translate-x-1/2 rounded-lg border border-line-2 bg-bg-1 shadow-[var(--shadow-lg)] {searchClass}"
      role="dialog"
      aria-modal="true"
    >
      {@render search()}
    </div>
  {/if}
</div>
