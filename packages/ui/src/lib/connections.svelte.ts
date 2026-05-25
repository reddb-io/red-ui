// Live connections store. The UI picks one of these as the "active" target
// and every data view checks `connection.client` — if null, it falls back to
// fixtures so the app is browseable without a server running.

import { RedClient, type Stats, type ReplicationStatus } from '@red-ui/protocol'

export interface ConnectionPreset {
  id: string
  label: string
  url: string
  role: 'primary' | 'replica' | 'embedded'
  description: string
}

export const PRESETS: ConnectionPreset[] = [
  { id: 'fixtures',        label: 'Fixtures (offline)', url: '',                       role: 'embedded', description: 'No server — pre-baked demo data.' },
  { id: 'embedded',        label: 'Embedded',           url: 'http://localhost:8080',  role: 'embedded', description: 'Local file via ./scripts/embedded.sh.' },
  { id: 'docker-primary',  label: 'Docker primary',     url: 'http://localhost:18080', role: 'primary',  description: 'Docker compose primary (./docker/compose.yml).' },
  { id: 'docker-replica',  label: 'Docker replica',     url: 'http://localhost:18081', role: 'replica',  description: 'Read-only mirror of docker primary.' },
]

interface ProbeResult {
  reachable: boolean
  rtt_ms?: number
  stats?: Stats
  replication?: ReplicationStatus
  error?: string
}

class ConnectionStore {
  active = $state<ConnectionPreset>(PRESETS[0])
  probe = $state<ProbeResult>({ reachable: false })

  get client(): RedClient | null {
    return this.active.url ? new RedClient(this.active.url) : null
  }

  async switch(preset: ConnectionPreset) {
    this.active = preset
    await this.refresh()
  }

  async refresh() {
    const client = this.client
    if (!client) {
      this.probe = { reachable: false }
      return
    }
    try {
      const ping = await client.ping()
      if (!ping.ok) {
        this.probe = { reachable: false, error: ping.error }
        return
      }
      const [stats, replication] = await Promise.all([
        client.stats().catch(() => undefined),
        client.replication().catch(() => undefined),
      ])
      this.probe = { reachable: true, rtt_ms: ping.rtt_ms, stats, replication }
    } catch (e) {
      this.probe = { reachable: false, error: (e as Error).message }
    }
  }
}

export const connection = new ConnectionStore()
