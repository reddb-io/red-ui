// ResultsPane tab state — Svelte 5 runes store.
//
// Each tab is keyed on (kind, key) so the same collection always
// collapses to a single tab; Cmd+click bypasses that by minting a fresh
// id so a duplicate tab opens.

import type { Capability } from './renderers'

export type TabKind = 'collection' | 'query' | 'live-changes' | 'welcome'

export interface Tab {
  /** Unique within the pane. Stable when re-focusing existing tabs. */
  id: string
  kind: TabKind
  /** Display label in the tab header. */
  label: string
  /** Stable identity for collapsing duplicates (collection name, query hash). */
  key: string
  /** Optional capability hint forwarded to the renderer registry. */
  capability?: Capability
  /** Renderer override (slice #9 wires the UI; the field exists today). */
  overrideCapability?: Capability
}

function uid(): string {
  // Small, debug-friendly id. Crypto.randomUUID is overkill for in-pane state.
  return Math.random().toString(36).slice(2, 10)
}

class TabsStore {
  tabs = $state<Tab[]>([])
  activeId = $state<string | null>(null)

  active = $derived(this.tabs.find((t) => t.id === this.activeId) ?? null)

  /**
   * Open or focus a tab.
   * - If `forceNew` is false (default) and a tab with the same (kind,key)
   *   exists, focus that tab. Otherwise add a new one and focus it.
   * - If `forceNew` is true, always mint a fresh tab id.
   */
  open(spec: Omit<Tab, 'id'>, forceNew = false): Tab {
    if (!forceNew) {
      const existing = this.tabs.find((t) => t.kind === spec.kind && t.key === spec.key)
      if (existing) {
        this.activeId = existing.id
        return existing
      }
    }
    const tab: Tab = { ...spec, id: uid() }
    this.tabs = [...this.tabs, tab]
    this.activeId = tab.id
    return tab
  }

  focus(id: string): void {
    if (this.tabs.some((t) => t.id === id)) this.activeId = id
  }

  /**
   * Close a tab. Focus moves to the previously active tab if it still
   * exists, otherwise to the neighbour on the left, otherwise null.
   * `previousActiveId` lets the caller pass a remembered focus so close
   * → reopen → close returns to whatever was focused before the closing.
   */
  close(id: string, previousActiveId?: string | null): void {
    const idx = this.tabs.findIndex((t) => t.id === id)
    if (idx < 0) return
    const wasActive = this.activeId === id
    this.tabs = this.tabs.filter((t) => t.id !== id)
    if (wasActive) {
      if (previousActiveId && this.tabs.some((t) => t.id === previousActiveId)) {
        this.activeId = previousActiveId
      } else if (this.tabs.length === 0) {
        this.activeId = null
      } else {
        const fallback = this.tabs[Math.max(0, idx - 1)]
        this.activeId = fallback?.id ?? null
      }
    }
  }

  rename(id: string, label: string): void {
    this.tabs = this.tabs.map((t) => (t.id === id ? { ...t, label } : t))
  }

  setOverride(id: string, capability: Capability | undefined): void {
    this.tabs = this.tabs.map((t) =>
      t.id === id ? { ...t, overrideCapability: capability } : t,
    )
  }

  clear(): void {
    this.tabs = []
    this.activeId = null
  }
}

export const tabs = new TabsStore()
