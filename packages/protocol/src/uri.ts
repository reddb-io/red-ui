import type { ConnectionTarget, NodeRole, Transport } from './types.ts'

const TRANSPORTS: Record<string, Transport> = {
  red: 'tcp',
  'red+tls': 'tls',
  'red+unix': 'unix',
  'red+http': 'http',
  'red+https': 'https',
}

export function parseRedUri(uri: string): ConnectionTarget {
  const match = uri.match(/^([a-z+]+):\/\/(.+)$/i)
  if (!match) throw new Error(`Invalid red:// URI: ${uri}`)
  const [, scheme, rest] = match

  const transport = TRANSPORTS[scheme.toLowerCase()]
  if (!transport) throw new Error(`Unsupported scheme: ${scheme}`)

  if (transport === 'unix') {
    const [path, query = ''] = rest.split('?')
    return {
      transport,
      host: 'localhost',
      path: decodeURIComponent(path),
      params: parseQuery(query),
    }
  }

  const url = new URL(`http://${rest}`)
  const params = parseQuery(url.search.slice(1))
  const role = params.role as NodeRole | undefined
  const database = url.pathname.replace(/^\//, '') || undefined

  return {
    transport,
    host: url.hostname,
    port: url.port ? Number(url.port) : undefined,
    database,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    role,
    params,
  }
}

function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!qs) return out
  for (const pair of qs.split('&')) {
    const [k, v = ''] = pair.split('=')
    if (k) out[decodeURIComponent(k)] = decodeURIComponent(v)
  }
  return out
}
