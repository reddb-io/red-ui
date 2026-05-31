import { describe, expect, it } from 'vitest'
import { parseRedUri } from './uri'

describe('parseRedUri', () => {
  it('parses tcp with auth and db', () => {
    const t = parseRedUri('red://user:p%40ss@host:6379/main?role=primary')
    expect(t).toMatchObject({
      transport: 'tcp',
      host: 'host',
      port: 6379,
      username: 'user',
      password: 'p@ss',
      database: 'main',
      role: 'primary',
    })
  })

  it('parses unix socket', () => {
    const t = parseRedUri('red+unix:///var/run/reddb.sock?role=embedded')
    expect(t.transport).toBe('unix')
    expect(t.path).toBe('/var/run/reddb.sock')
    expect(t.params.role).toBe('embedded')
  })

  it('parses tls cluster endpoint', () => {
    const t = parseRedUri('red+tls://cluster.reddb.io:443')
    expect(t.transport).toBe('tls')
    expect(t.port).toBe(443)
  })

  it('rejects bad scheme', () => {
    expect(() => parseRedUri('foo://bar')).toThrow()
  })
})
