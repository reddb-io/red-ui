<script lang="ts">
  import { useWorkspace, workspaceKeyboardTarget } from './workspace-context'
  import { onMount } from 'svelte'
  import { CommandPalette as Palette } from '@reddb-io/design-system/app'
  import { isEventFromModal } from '@reddb-io/design-system/base/interaction'
  import { useRouter, type RouteTarget } from './router.svelte'

  const workspace = useWorkspace()
  const { theme } = workspace

  const router = useRouter()

  type Group = 'navigate' | 'data' | 'actions' | 'view'

  interface Command {
    id: string
    group: Group
    label: string
    hint?: string
    shortcut?: string
    run: () => void
  }

  let open = $state(false)

  const fire = workspace.dispatch

  const commands: Command[] = [
    { id: 'ask', group: 'navigate', label: 'Open ask', hint: '/ask', run: () => navigate({ view: 'ask' }) },
    { id: 'query', group: 'navigate', label: 'Open query', hint: '/query', run: () => navigate({ view: 'query' }) },
    { id: 'collections', group: 'navigate', label: 'Open collections', hint: '/collections', run: () => navigate({ view: 'collections' }) },
    { id: 'topology', group: 'navigate', label: 'Open cluster', hint: '/cluster', run: () => navigate({ view: 'cluster' }) },
    { id: 'security', group: 'navigate', label: 'Open security', hint: '/security', run: () => navigate({ view: 'security' }) },
    { id: 'analytics', group: 'navigate', label: 'Open analytics', hint: '/analytics', run: () => navigate({ view: 'analytics' }) },
    { id: 'settings', group: 'navigate', label: 'Open settings', hint: '/settings', run: () => navigate({ view: 'settings' }) },
    { id: 'appearance', group: 'navigate', label: 'Open appearance', hint: '/appearance', run: () => navigate({ view: 'appearance' }) },

    { id: 'new-query', group: 'data', label: 'New query', shortcut: '⌘T', run: () => { fire('red:new-query'); close() } },

    { id: 'open-connect', group: 'actions', label: 'Open Connect dropdown', shortcut: '⌘⇧C', run: () => { fire('red:open-connect'); close() } },
    { id: 'apply-pending', group: 'actions', label: 'Review pending changes', run: () => { fire('red:apply-pending'); close() } },
    { id: 'discard-pending', group: 'actions', label: 'Review changes to discard', run: () => { fire('red:discard-pending'); close() } },

    { id: 'toggle-theme', group: 'view', label: 'Toggle theme (light / dark)', hint: 'theme', run: () => { theme.toggle(); close() } },
    { id: 'show-shortcuts', group: 'view', label: 'Show keyboard shortcuts', shortcut: '?', run: () => { close(); fire('red:open-shortcuts') } },
  ]

  function navigate(target: RouteTarget) {
    router.go(target)
    close()
  }

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
    if (!workspace.ownsKeyboard(e)) return
    const mod = e.metaKey || e.ctrlKey
    const k = e.key.toLowerCase()

    if (isEventFromModal(e) && !open) return
    if (mod && k === 'k') {
      e.preventDefault()
      open = !open
      return
    }

    if (isEventFromModal(e)) return

    // Global accelerators wired here so they fire regardless of focus.
    if (mod && e.shiftKey && k === 'c') {
      e.preventDefault()
      fire('red:open-connect')
      return
    }
    if (mod && !e.shiftKey && k === 't' && !e.composedPath().some(isTypingTarget) && !isTypingTarget(e.target)) {
      e.preventDefault()
      fire('red:new-query')
      return
    }

  }

  onMount(() => {
    const keyboardTarget = workspaceKeyboardTarget(workspace)
    keyboardTarget.addEventListener('keydown', onKey as EventListener)
    const onOpen = () => {
      open = true
    }
    const stop = workspace.on('red:open-palette', onOpen)
    return () => {
      keyboardTarget.removeEventListener('keydown', onKey as EventListener)
      stop()
    }
  })

  const groupLabel: Record<Group, string> = {
    navigate: 'Navigate',
    data: 'Data',
    actions: 'Actions',
    view: 'View',
  }
</script>

<Palette presentation="dialog" contentLabel="Global commands" label="Search or run a command"
  placeholder="Search or run a command…" bind:open
  commands={commands.map(command => ({ id: command.id, label: command.label,
    group: groupLabel[command.group], description: command.hint,
    shortcut: command.shortcut ? Array.from(command.shortcut) : undefined,
    onselect: command.run,
  }))} />
