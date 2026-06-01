import { afterEach, describe, expect, it, vi } from 'vitest'
import { RedClient } from './client'
import { EMPTY_SERVER_CAPABILITIES, capabilitiesFromSignal } from './server-capabilities'

// Build a fetch stub from a path→Response map. Unmapped paths 404 (route not
// found) — exactly the signal an older server gives for an absent endpoint.
function stubFetch(routes: Record<string, () => Response>) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input)).pathname + new URL(String(input)).search
    for (const [match, make] of Object.entries(routes)) {
      if (path === match || path.startsWith(match)) return make()
    }
    return new Response(JSON.stringify({ ok: false, error: `route not found: GET ${path}` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  })
}

describe('capabilitiesFromSignal', () => {
  it('maps the features list (with aliases) onto known capabilities', () => {
    expect(capabilitiesFromSignal({ features: ['versioning', 'cluster_status', 'unknown_thing'] }))
      .toEqual({ ...EMPTY_SERVER_CAPABILITIES, vcs: true, clusterStatus: true })
  })

  it('honours an explicit capability flag map', () => {
    expect(capabilitiesFromSignal({ capabilities: { vcs: true, cdc_stream: false } }))
      .toEqual({ ...EMPTY_SERVER_CAPABILITIES, vcs: true })
  })

  it('ignores unknown feature names (newer server, older UI)', () => {
    expect(capabilitiesFromSignal({ features: ['time_travel_v9'] })).toEqual(EMPTY_SERVER_CAPABILITIES)
  })
})

describe('RedClient.capabilities — negotiation', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('prefers the stable /capabilities signal when present', async () => {
    vi.stubGlobal('fetch', stubFetch({
      '/capabilities': () => Response.json({ ok: true, features: ['vcs', 'collection_metadata'] }),
    }))
    const caps = await new RedClient('http://reddb.test').capabilities()
    expect(caps).toEqual({ ...EMPTY_SERVER_CAPABILITIES, vcs: true, collectionMetadata: true })
  })

  it('infers from route probes when /capabilities is absent (older server)', async () => {
    // /capabilities 404s; the VCS probe succeeds, cluster status 404s.
    vi.stubGlobal('fetch', stubFetch({
      '/repo/commits': () => Response.json({ ok: true, result: [] }),
    }))
    const caps = await new RedClient('http://reddb.test').capabilities()
    expect(caps).toEqual({ ...EMPTY_SERVER_CAPABILITIES, vcs: true, clusterStatus: false })
  })

  it('an even older server with no optional routes resolves to all-unsupported', async () => {
    vi.stubGlobal('fetch', stubFetch({})) // every probe 404s
    const caps = await new RedClient('http://reddb.test').capabilities()
    expect(caps).toEqual(EMPTY_SERVER_CAPABILITIES)
  })

  it('fails safe (hide everything) when the probe errors at the network level', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down') }))
    const caps = await new RedClient('http://reddb.test').capabilities()
    expect(caps).toEqual(EMPTY_SERVER_CAPABILITIES)
  })

  it('fails safe when /capabilities returns a non-404 error (e.g. 500/auth)', async () => {
    vi.stubGlobal('fetch', stubFetch({
      '/capabilities': () => new Response('boom', { status: 500 }),
    }))
    const caps = await new RedClient('http://reddb.test').capabilities()
    expect(caps).toEqual(EMPTY_SERVER_CAPABILITIES)
  })
})
