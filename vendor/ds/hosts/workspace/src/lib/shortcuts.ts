export type ShortcutContext = 'Global' | 'Connection' | 'Workspace' | 'Editing'

export interface Shortcut {
  id: string
  context: ShortcutContext
  keys: string[]
  label: string
}

/**
 * Single source of truth for keyboard shortcuts shown in the `?` overlay.
 * Only list shortcuts that are actually wired somewhere in the app.
 */
export const shortcuts: Shortcut[] = [
  { id: 'palette', context: 'Global', keys: ['⌘', 'K'], label: 'Open command palette' },
  { id: 'shortcuts', context: 'Global', keys: ['?'], label: 'Show keyboard shortcuts' },
  { id: 'new-query', context: 'Global', keys: ['⌘', 'T'], label: 'New query' },
  { id: 'open-connect', context: 'Connection', keys: ['⌘', '⇧', 'C'], label: 'Open Connect dropdown' },
  { id: 'dismiss', context: 'Editing', keys: ['Esc'], label: 'Cancel / dismiss overlay or palette' },
]

export const shortcutContexts: ShortcutContext[] = ['Global', 'Connection', 'Workspace', 'Editing']
