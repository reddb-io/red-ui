import { afterEach, describe, expect, it, vi } from 'vitest'
import { RedClient } from './client'

describe('RedClient collection metadata probing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('coalesces unsupported collection metadata route detection per base URL', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({
        ok: false,
        error: 'route not found: GET /collections/characters',
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = new RedClient('http://reddb.test', { proxyPath: '' })
    const results = await Promise.allSettled([
      client.collection('characters'),
      client.collection('grimm_graph'),
      client.collection('tales'),
    ])

    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
