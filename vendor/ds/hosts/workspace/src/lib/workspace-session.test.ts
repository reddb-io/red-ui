import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WorkspaceSession, type WorkspaceSnapshot, type KeyValueStorage } from './workspace-session'

class MemStorage implements KeyValueStorage {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
}

const makeSnap = (view: WorkspaceSnapshot['view'] = 'collections'): WorkspaceSnapshot => ({
  view,
  collection: null,
  subpage: null,
  tabs: [],
  activeTabId: null,
})

describe('WorkspaceSession', () => {
  let storage: MemStorage

  beforeEach(() => {
    vi.useFakeTimers()
    storage = new MemStorage()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('restore() returns null when nothing has been saved', () => {
    const s = new WorkspaceSession(200, storage)
    expect(s.restore()).toBeNull()
  })

  it('flush() saves immediately without waiting for the debounce', () => {
    const s = new WorkspaceSession(500, storage)
    s.flush(makeSnap('cluster'))
    expect(s.restore()?.view).toBe('cluster')
  })

  it('flush() without a prior schedule still saves', () => {
    const s = new WorkspaceSession(200, storage)
    s.flush(makeSnap('settings'))
    expect(s.restore()?.view).toBe('settings')
  })

  it('schedule() does not save before the debounce window elapses', () => {
    const s = new WorkspaceSession(200, storage)
    s.schedule(makeSnap('cluster'))
    vi.advanceTimersByTime(100)
    expect(s.restore()).toBeNull()
  })

  it('schedule() saves after the debounce window elapses', () => {
    const s = new WorkspaceSession(200, storage)
    s.schedule(makeSnap('cluster'))
    vi.advanceTimersByTime(200)
    expect(s.restore()?.view).toBe('cluster')
  })

  it('schedule() debounces — multiple calls reset the timer; only the last snapshot is saved', () => {
    const s = new WorkspaceSession(200, storage)
    s.schedule(makeSnap('cluster'))
    vi.advanceTimersByTime(100)
    s.schedule(makeSnap('security'))
    vi.advanceTimersByTime(100)
    // Only 100ms past the second call — timer should not have fired yet
    expect(s.restore()).toBeNull()
    vi.advanceTimersByTime(100)
    expect(s.restore()?.view).toBe('security')
  })

  it('flush() cancels a pending debounce — the debounced snapshot is never written', () => {
    const s = new WorkspaceSession(200, storage)
    s.schedule(makeSnap('cluster'))   // debounce armed with 'cluster'
    vi.advanceTimersByTime(50)
    s.flush(makeSnap('security'))     // close-request fires — flush 'security'
    expect(s.restore()?.view).toBe('security')
    // Advancing past the original debounce window must NOT overwrite with 'cluster'
    vi.advanceTimersByTime(200)
    expect(s.restore()?.view).toBe('security')
  })

  it('close-request ordering: flush wins over pending debounce (simulates close before autosave fires)', () => {
    const s = new WorkspaceSession(1000, storage)
    s.schedule(makeSnap('cluster'))  // autosave at t+1000
    vi.advanceTimersByTime(300)
    s.flush(makeSnap('ask'))         // close-request at t=300
    expect(s.restore()?.view).toBe('ask')
    vi.advanceTimersByTime(1000)     // debounce would have fired here — must be cancelled
    expect(s.restore()?.view).toBe('ask')
  })

  it('restore() returns null for corrupted storage', () => {
    const s = new WorkspaceSession(200, storage)
    storage.setItem('red-ui-workspace-session', '{not: valid json}')
    expect(s.restore()).toBeNull()
  })

  it('restore() returns null when the stored payload lacks a view field', () => {
    const s = new WorkspaceSession(200, storage)
    storage.setItem('red-ui-workspace-session', JSON.stringify({ tabs: [] }))
    expect(s.restore()).toBeNull()
  })

  it('restore() roundtrips tabs and activeTabId', () => {
    const s = new WorkspaceSession(200, storage)
    const snap: WorkspaceSnapshot = {
      view: 'collections',
      collection: 'users',
      subpage: 'table',
      tabs: [{ id: 't1', kind: 'collection', label: 'users', key: 'users' }],
      activeTabId: 't1',
    }
    s.flush(snap)
    const restored = s.restore()
    expect(restored?.tabs).toHaveLength(1)
    expect(restored?.tabs[0].id).toBe('t1')
    expect(restored?.activeTabId).toBe('t1')
    expect(restored?.collection).toBe('users')
  })
})
