<script lang="ts">
  import { onMount } from 'svelte'
  import { isEventFromModal } from '@reddb-io/design-system/base/interaction'
  import { ShortcutHelp } from '@reddb-io/design-system/app'
  import { shortcuts, shortcutContexts, type ShortcutContext } from './shortcuts'

  let open = $state(false)

  function isTypingTarget(el: EventTarget | null): boolean {
    if (!(el instanceof HTMLElement)) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  function onKey(e: KeyboardEvent) {
    if (isEventFromModal(e)) return
    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (e.composedPath().some(isTypingTarget) || isTypingTarget(e.target)) return
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

<ShortcutHelp title="Keyboard shortcuts" bind:open groups={grouped.map(({ ctx, items }) => ({
  id: ctx, label: ctx, description: ctxBlurb[ctx],
  items: items.map((item, index) => ({ id: `${ctx}-${index}`, label: item.label, keys: item.keys })),
}))} />
