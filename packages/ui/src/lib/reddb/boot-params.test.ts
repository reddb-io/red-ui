import { describe, expect, it } from 'vitest'
import { hasBootEndpoint, parseBootParams } from './boot-params'
import { LocalUrlProvider } from './local-url-provider'

describe('parseBootParams', () => {
  it('reads endpoint + view from the app URL query', () => {
    expect(parseBootParams('?endpoint=http://host:5055&view=cluster')).toEqual({
      endpoint: 'http://host:5055',
      view: 'cluster',
    })
  })

  it('accepts the legacy endpoint aliases', () => {
    expect(parseBootParams('?connection=red://h').endpoint).toBe('red://h')
    expect(parseBootParams('?red_url=http://h').endpoint).toBe('http://h')
    expect(parseBootParams('?red=http://h').endpoint).toBe('http://h')
  })

  it('NEVER surfaces a token from the URL (secrets dropped)', () => {
    const b = parseBootParams('?endpoint=http://h&token=supersecret&api_key=k&password=p')
    expect(b.endpoint).toBe('http://h')
    expect(JSON.stringify(b)).not.toContain('supersecret')
    expect(JSON.stringify(b)).not.toContain('"k"')
    expect(Object.keys(b)).toEqual(['endpoint'])
  })

  it('returns an empty object when nothing is seeded', () => {
    expect(parseBootParams('')).toEqual({})
    expect(hasBootEndpoint(parseBootParams(''))).toBe(false)
    expect(hasBootEndpoint(parseBootParams('?endpoint=http://h'))).toBe(true)
  })
})

describe('LocalUrlProvider.bootParams', () => {
  it('surfaces seeded params and ignores an endpoint-less seed', () => {
    const seeded = new LocalUrlProvider({ bootParams: { endpoint: 'http://h', view: 'query' } })
    expect(seeded.bootParams()).toEqual({ endpoint: 'http://h', view: 'query' })

    const viewOnly = new LocalUrlProvider({ bootParams: { view: 'query' } })
    expect(viewOnly.bootParams()).toBeNull() // no endpoint ⇒ nothing to auto-connect

    expect(new LocalUrlProvider().bootParams()).toBeNull()
  })
})
