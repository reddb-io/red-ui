import { describe, expect, it } from 'vitest'
import {
  encodeOpenContract,
  isBrowserReachableUrl,
  isSafeRoute,
  parseOpenContract,
  type OpenContract,
} from './open-contract'

describe('isBrowserReachableUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isBrowserReachableUrl('http://localhost:5055')).toBe(true)
    expect(isBrowserReachableUrl('https://db.example.com')).toBe(true)
  })

  it('rejects filesystem paths and non-http schemes', () => {
    expect(isBrowserReachableUrl('/var/run/reddb.sock')).toBe(false)
    expect(isBrowserReachableUrl('./mydb.rdb')).toBe(false)
    expect(isBrowserReachableUrl('../db.rdb')).toBe(false)
    expect(isBrowserReachableUrl('~/db.rdb')).toBe(false)
    expect(isBrowserReachableUrl('file:///Users/foo/db.rdb')).toBe(false)
    expect(isBrowserReachableUrl('red://localhost')).toBe(false)
    expect(isBrowserReachableUrl('not a url at all')).toBe(false)
    expect(isBrowserReachableUrl('')).toBe(false)
  })
})

describe('isSafeRoute', () => {
  it('accepts absolute same-origin paths', () => {
    expect(isSafeRoute('/')).toBe(true)
    expect(isSafeRoute('/c/users')).toBe(true)
    expect(isSafeRoute('/query?tab=2')).toBe(true)
  })

  it('rejects protocol-relative and external routes', () => {
    expect(isSafeRoute('//evil.com')).toBe(false)
    expect(isSafeRoute('/\\evil.com')).toBe(false)
    expect(isSafeRoute('https://evil.com')).toBe(false)
    expect(isSafeRoute('c/users')).toBe(false)
    expect(isSafeRoute('')).toBe(false)
  })
})

describe('encode/parse round-trips', () => {
  const cases: OpenContract[] = [
    {},
    { cs: 'http://localhost:5055' },
    { to: '/c/users' },
    { token: 'eyJhbGciOi.payload.sig' },
    { cs: 'https://db.example.com:8443', to: '/query', token: 'short-lived-123' },
    { cs: 'http://localhost:5055', to: '/c/my%20coll' },
  ]

  for (const contract of cases) {
    it(`round-trips ${JSON.stringify(contract)}`, () => {
      const parts = encodeOpenContract(contract)
      const { contract: parsed, warnings } = parseOpenContract(parts)
      expect(warnings).toEqual([])
      expect(parsed).toEqual(contract)
    })
  }

  it('round-trips through a full URL string', () => {
    const parts = encodeOpenContract({ cs: 'http://localhost:5055', to: '/cluster', token: 'abc' })
    const full = `https://ui.reddb.io/${parts.search}${parts.hash}`
    const { contract } = parseOpenContract(full)
    expect(contract).toEqual({ cs: 'http://localhost:5055', to: '/cluster', token: 'abc' })
  })
})

describe('parseOpenContract — sources', () => {
  it('reads from a window.location-like object', () => {
    const { contract } = parseOpenContract({
      search: '?cs=http%3A%2F%2Flocalhost%3A5055&to=%2Fquery',
      hash: '#token=abc',
    })
    expect(contract).toEqual({ cs: 'http://localhost:5055', to: '/query', token: 'abc' })
  })

  it('reads from a URL instance', () => {
    const url = new URL('https://ui.reddb.io/?cs=http://localhost:5055#token=xyz')
    const { contract } = parseOpenContract(url)
    expect(contract.cs).toBe('http://localhost:5055')
    expect(contract.token).toBe('xyz')
  })

  it('tolerates a bare search#hash tail string', () => {
    const { contract } = parseOpenContract('?cs=http://localhost:5055#token=t')
    expect(contract).toEqual({ cs: 'http://localhost:5055', token: 't' })
  })
})

describe('token invariant — only the #hash carries it', () => {
  it('encode never emits the token into the query string', () => {
    const parts = encodeOpenContract({ cs: 'http://localhost:5055', token: 'secret' })
    expect(parts.search).not.toContain('token')
    expect(parts.search).not.toContain('secret')
    expect(parts.hash).toContain('token=secret')
  })

  it('parse ignores a token supplied in the query string', () => {
    const { contract, warnings } = parseOpenContract({
      search: '?cs=http://localhost:5055&token=leaked',
      hash: '',
    })
    expect(contract.token).toBeUndefined()
    expect(warnings.some((w) => w.includes('token present in query string'))).toBe(true)
  })

  it('parse honours a token only when it is in the hash', () => {
    const { contract } = parseOpenContract({ search: '', hash: '#token=good' })
    expect(contract.token).toBe('good')
  })

  it('a query token does not override or mix with the hash token', () => {
    const { contract } = parseOpenContract({
      search: '?token=leaked',
      hash: '#token=real',
    })
    expect(contract.token).toBe('real')
  })
})

describe('no-path invariant — cs must be a browser-reachable URL', () => {
  it('rejects a filesystem-path cs and warns', () => {
    const { contract, warnings } = parseOpenContract({
      search: '?cs=' + encodeURIComponent('/Users/me/mydb.rdb'),
      hash: '',
    })
    expect(contract.cs).toBeUndefined()
    expect(warnings.some((w) => w.includes('cs is not a browser-reachable'))).toBe(true)
  })

  it('rejects a relative-path cs', () => {
    const { contract } = parseOpenContract({
      search: '?cs=' + encodeURIComponent('./mydb.rdb'),
      hash: '',
    })
    expect(contract.cs).toBeUndefined()
  })

  it('rejects a file:// cs', () => {
    const { contract } = parseOpenContract({
      search: '?cs=' + encodeURIComponent('file:///var/db.rdb'),
      hash: '',
    })
    expect(contract.cs).toBeUndefined()
  })

  it('encode throws on a non-reachable cs', () => {
    expect(() => encodeOpenContract({ cs: '/var/db.rdb' })).toThrow()
    expect(() => encodeOpenContract({ cs: 'file:///db.rdb' })).toThrow()
  })
})

describe('malformed / partial input is tolerated', () => {
  it('empty location yields an empty contract and no warnings', () => {
    const { contract, warnings } = parseOpenContract({ search: '', hash: '' })
    expect(contract).toEqual({})
    expect(warnings).toEqual([])
  })

  it('garbage query string yields an empty contract', () => {
    const { contract } = parseOpenContract({ search: '?=&=&&%%%', hash: '' })
    expect(contract).toEqual({})
  })

  it('drops an unsafe to but keeps a valid cs', () => {
    const { contract, warnings } = parseOpenContract({
      search: '?cs=http://localhost:5055&to=' + encodeURIComponent('//evil.com'),
      hash: '',
    })
    expect(contract.cs).toBe('http://localhost:5055')
    expect(contract.to).toBeUndefined()
    expect(warnings.some((w) => w.includes('to must be a same-origin path'))).toBe(true)
  })

  it('an empty hash token is treated as absent', () => {
    const { contract } = parseOpenContract({ search: '', hash: '#token=' })
    expect(contract.token).toBeUndefined()
  })
})
