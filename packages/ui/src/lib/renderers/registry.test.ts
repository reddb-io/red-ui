import { describe, expect, it } from 'vitest'
import type { QueryResult } from '@red-ui/protocol'
import { RendererRegistry } from './registry'
import type { CapabilityRenderer } from './types'

function fakeResult(): QueryResult {
  return {
    ok: true,
    query: 'SELECT * FROM users LIMIT 10',
    record_count: 0,
    result: { columns: ['id', 'name'], records: [] },
  }
}

function stubRenderer(
  capability: CapabilityRenderer['capability'],
  renders: CapabilityRenderer['renders'] = () => true,
): CapabilityRenderer {
  return {
    capability,
    renders,
    // Component type is checked structurally; tests don't actually mount.
    component: (() => null) as unknown as CapabilityRenderer['component'],
  }
}

describe('RendererRegistry', () => {
  it('register adds a renderer and replaces by capability on re-register', () => {
    const r = new RendererRegistry()
    const a = stubRenderer('table')
    const b = stubRenderer('table')
    r.register(a)
    r.register(b)
    expect(r.list()).toHaveLength(1)
    expect(r.list()[0]).toBe(b)
  })

  it('pick returns the renderer registered for the hint capability', () => {
    const r = new RendererRegistry()
    const table = stubRenderer('table')
    const graph = stubRenderer('graph')
    r.register(table)
    r.register(graph)
    expect(r.pick('graph', fakeResult())).toBe(graph)
    expect(r.pick('table', fakeResult())).toBe(table)
  })

  it('pick falls back to the table renderer when capability is unknown', () => {
    const r = new RendererRegistry()
    const table = stubRenderer('table')
    r.register(table)
    expect(r.pick('vector', fakeResult())).toBe(table)
    expect(r.pick(undefined, fakeResult())).toBe(table)
  })

  it('pick falls back to any renderer whose renders() agrees when capability is unknown', () => {
    const r = new RendererRegistry()
    const graph = stubRenderer('graph', () => true)
    r.register(graph)
    // No table fallback registered, but graph claims it — use graph.
    expect(r.pick('vector', fakeResult())).toBe(graph)
  })

  it('pick throws when nothing matches and no table fallback is registered', () => {
    const r = new RendererRegistry()
    const graph = stubRenderer('graph', () => false)
    r.register(graph)
    expect(() => r.pick(undefined, fakeResult())).toThrow(/no table fallback/i)
  })

  it('override forces a specific renderer regardless of hint or shape', () => {
    const r = new RendererRegistry()
    const table = stubRenderer('table')
    const json = stubRenderer('json', () => false)
    r.register(table)
    r.register(json)
    // Hint says table, shape disagrees with json, but override wins.
    expect(r.pick('table', fakeResult(), 'json')).toBe(json)
  })

  it('override is ignored when the overridden capability is not registered', () => {
    const r = new RendererRegistry()
    const table = stubRenderer('table')
    r.register(table)
    // 'vector' isn't registered, override has no effect, table wins.
    expect(r.pick('table', fakeResult(), 'vector')).toBe(table)
  })

  it('has and unregister behave as expected', () => {
    const r = new RendererRegistry()
    r.register(stubRenderer('table'))
    expect(r.has('table')).toBe(true)
    r.unregister('table')
    expect(r.has('table')).toBe(false)
  })

  it('pick skips a hint-matched renderer whose renders() rejects this result and falls back', () => {
    const r = new RendererRegistry()
    const table = stubRenderer('table')
    const json = stubRenderer('json', () => false)
    r.register(table)
    r.register(json)
    // Hint says json but its renders() rejects → fall back to table.
    expect(r.pick('json', fakeResult())).toBe(table)
  })
})
