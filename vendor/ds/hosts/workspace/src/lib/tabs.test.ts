import { describe, expect, it, beforeEach } from 'vitest'
import { tabs } from './tabs.svelte'

beforeEach(() => tabs.clear())

const collectionTab = (name: string) => ({
  kind: 'collection' as const,
  label: name,
  key: name,
  capability: 'table' as const,
})

describe('tabs store', () => {
  it('open() adds a new tab and focuses it', () => {
    const t = tabs.open(collectionTab('users'))
    expect(tabs.tabs).toHaveLength(1)
    expect(tabs.activeId).toBe(t.id)
  })

  it('open() with the same (kind, key) focuses the existing tab instead of duplicating', () => {
    const first = tabs.open(collectionTab('users'))
    tabs.open(collectionTab('orders'))
    const again = tabs.open(collectionTab('users'))
    expect(tabs.tabs).toHaveLength(2)
    expect(again.id).toBe(first.id)
    expect(tabs.activeId).toBe(first.id)
  })

  it('open() with forceNew=true always mints a new tab (Cmd+click flow)', () => {
    const first = tabs.open(collectionTab('users'))
    const second = tabs.open(collectionTab('users'), true)
    expect(tabs.tabs).toHaveLength(2)
    expect(second.id).not.toBe(first.id)
    expect(tabs.activeId).toBe(second.id)
  })

  it('close() on the active tab focuses the previously active tab if it still exists', () => {
    const a = tabs.open(collectionTab('a'))
    const b = tabs.open(collectionTab('b'))
    const c = tabs.open(collectionTab('c'))
    // Focus a, then b, then close b. Expect focus to return to a.
    tabs.focus(a.id)
    tabs.focus(b.id)
    tabs.close(b.id, a.id)
    expect(tabs.activeId).toBe(a.id)
    expect(tabs.tabs.map((t) => t.id)).toEqual([a.id, c.id])
  })

  it('close() on the active tab with no prior focus falls back to the left neighbour', () => {
    const a = tabs.open(collectionTab('a'))
    const b = tabs.open(collectionTab('b'))
    tabs.close(b.id)
    expect(tabs.activeId).toBe(a.id)
  })

  it('close() on the only tab clears focus (empty state)', () => {
    const a = tabs.open(collectionTab('a'))
    tabs.close(a.id)
    expect(tabs.tabs).toHaveLength(0)
    expect(tabs.activeId).toBeNull()
  })

  it('close() on an inactive tab leaves focus alone', () => {
    const a = tabs.open(collectionTab('a'))
    const b = tabs.open(collectionTab('b'))
    // b is active; close a
    tabs.close(a.id)
    expect(tabs.activeId).toBe(b.id)
  })

  it('setOverride mutates the override capability of a single tab', () => {
    const a = tabs.open(collectionTab('a'))
    tabs.setOverride(a.id, 'json')
    expect(tabs.tabs.find((t) => t.id === a.id)?.overrideCapability).toBe('json')
    tabs.setOverride(a.id, undefined)
    expect(tabs.tabs.find((t) => t.id === a.id)?.overrideCapability).toBeUndefined()
  })
})
