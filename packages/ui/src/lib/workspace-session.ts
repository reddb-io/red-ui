// Workspace session persistence — snapshot the active view, open tabs, and
// router location to localStorage so the app can restore on next launch.
//
// The class is injectable (pass a `storage` in tests) and pure — no Svelte
// runes, no browser globals at import time — so the node vitest suite can
// exercise it directly with a MemStorage.

import type { Tab } from './tabs.svelte'
import type { View } from './router.svelte'

export interface WorkspaceSnapshot {
  view: View
  collection: string | null
  subpage: string | null
  tabs: Tab[]
  activeTabId: string | null
}

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const STORAGE_KEY = 'red-ui-workspace-session'

export class WorkspaceSession {
  private _timer: ReturnType<typeof setTimeout> | null = null
  readonly debounceMs: number
  private readonly _storage: KeyValueStorage | null

  constructor(debounceMs = 1000, storage: KeyValueStorage | null = null) {
    this.debounceMs = debounceMs
    this._storage = storage
  }

  private _store(): KeyValueStorage | null {
    if (this._storage) return this._storage
    return typeof localStorage !== 'undefined' ? localStorage : null
  }

  private _write(snapshot: WorkspaceSnapshot): void {
    try {
      this._store()?.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // SSR or storage quota — silently skip
    }
  }

  /** Debounced save — resets the timer on every call. */
  schedule(snapshot: WorkspaceSnapshot): void {
    if (this._timer !== null) clearTimeout(this._timer)
    this._timer = setTimeout(() => {
      this._timer = null
      this._write(snapshot)
    }, this.debounceMs)
  }

  /** Cancel any pending debounce and save immediately. */
  flush(snapshot: WorkspaceSnapshot): void {
    if (this._timer !== null) {
      clearTimeout(this._timer)
      this._timer = null
    }
    this._write(snapshot)
  }

  /** Read the last persisted snapshot, or null if none or corrupted. */
  restore(): WorkspaceSnapshot | null {
    try {
      const raw = this._store()?.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as WorkspaceSnapshot
      if (typeof parsed.view !== 'string') return null
      return parsed
    } catch {
      return null
    }
  }
}

export const workspaceSession = new WorkspaceSession()
