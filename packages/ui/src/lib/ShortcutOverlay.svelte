<script lang="ts">
  import { onMount } from 'svelte'
  import { Kbd } from '@reddb-io/ui-kit'
  import { shortcuts, shortcutContexts, type ShortcutContext } from './shortcuts'

  let open = $state(false)

  function close() {
    open = false
  }

  function isTypingTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
      return
    }
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (isTypingTarget(e.target)) return
      e.preventDefault()
      open = !open
    }
  }

  onMount(() => {
    window.addEventListener('keydown', onKey)
    const onOpen = () => { open = true }
    window.addEventListener('red:open-shortcuts', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('red:open-shortcuts', onOpen)
    }
  })

  const grouped = $derived(
    shortcutContexts
      .map((ctx) => ({ ctx, items: shortcuts.filter((s) => s.context === ctx) }))
      .filter((g) => g.items.length > 0)
  )

  const ctxBlurb: Record<ShortcutContext, string> = {
    Global: 'Available anywhere in the app',
    Connection: 'Manage which reddb you talk to',
    Workspace: 'Move between tabs and panes',
    Editing: 'While editing data or running queries',
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[200] bg-bg-0/70 backdrop-blur-md flex items-center justify-center p-6"
    onclick={close}
    role="presentation"
  >
    <div
      class="w-full max-w-[640px] max-h-[80vh] overflow-y-auto bg-bg-1 border border-line-2 rounded-lg shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={null}
    >
      <header class="flex items-center justify-between px-5 py-3 border-b border-line-1">
        <div class="flex items-center gap-2">
          <span class="type-label">Keyboard shortcuts</span>
        </div>
        <div class="flex items-center gap-1.5 text-fg-3 text-[11px]">
          <Kbd>Esc</Kbd> close
        </div>
      </header>

      <div class="p-5 grid gap-5">
        {#each grouped as group}
          <section>
            <div class="flex items-baseline justify-between mb-2">
              <h3 class="type-label m-0">{group.ctx}</h3>
              <span class="text-fg-3 text-[11px]">{ctxBlurb[group.ctx]}</span>
            </div>
            <ul class="grid gap-1 m-0 p-0 list-none">
              {#each group.items as s}
                <li class="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-bg-2">
                  <span class="text-fg-1 text-[13px]">{s.label}</span>
                  <span class="inline-flex gap-1 shrink-0">
                    {#each s.keys as k}
                      <Kbd>{k}</Kbd>
                    {/each}
                  </span>
                </li>
              {/each}
            </ul>
          </section>
        {/each}
      </div>
    </div>
  </div>
{/if}
