<script lang="ts">
  import { Badge, Card, NodeBadge } from '@red-ui/ui-kit'
  import { connection } from '$lib/connections.svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { BarChart3 } from 'lucide-svelte'

  function fmtBytes(b: number) {
    if (b === 0) return '0 B'
    if (b < 1e3) return `${b} B`
    if (b < 1e6) return `${(b / 1e3).toFixed(1)} KB`
    if (b < 1e9) return `${(b / 1e6).toFixed(1)} MB`
    return `${(b / 1e9).toFixed(2)} GB`
  }
</script>

{#if !connection.probe.reachable}
  <PageHeader eyebrow="Explore" title="Statistics" />
  <EmptyState
    icon={BarChart3}
    title="No connection"
    message="Connect to a reddb instance to see live cluster metrics."
    hint="./scripts/embedded.sh   ·   docker compose up -d"
  />
{:else}
  {@const s = connection.probe.stats}
  {@const r = connection.probe.replication}

  <PageHeader
    eyebrow="Explore"
    title="Statistics"
    subtitle="Live from {connection.active.label} · {connection.probe.rtt_ms}ms · auto-refreshes every 5s"
  />

  {#if s}
    <div class="grid gap-3">
      <!-- KPI strip -->
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <Card>
          <div class="p-1">
            <div class="type-label">role</div>
            <div class="font-mono text-[20px] font-semibold mt-1">{r?.role ?? 'standalone'}</div>
          </div>
        </Card>
        <Card>
          <div class="p-1">
            <div class="type-label">collections</div>
            <div class="font-mono text-[20px] font-semibold mt-1">{s.store.collection_count}</div>
          </div>
        </Card>
        <Card>
          <div class="p-1">
            <div class="type-label">entities</div>
            <div class="font-mono text-[20px] font-semibold mt-1 text-accent">{s.store.total_entities.toLocaleString()}</div>
          </div>
        </Card>
        <Card>
          <div class="p-1">
            <div class="type-label">memory</div>
            <div class="font-mono text-[20px] font-semibold mt-1">{fmtBytes(s.store.total_memory_bytes)}</div>
          </div>
        </Card>
        <Card>
          <div class="p-1">
            <div class="type-label">active conn</div>
            <div class="font-mono text-[20px] font-semibold mt-1">{s.active_connections}</div>
          </div>
        </Card>
        <Card>
          <div class="p-1">
            <div class="type-label">checkouts</div>
            <div class="font-mono text-[20px] font-semibold mt-1">{(s as any).total_checkouts?.toLocaleString() ?? '—'}</div>
          </div>
        </Card>
      </div>

      <!-- KV counters from /stats.kv -->
      {#if s.kv}
        <Card title="kv operations">
          <div class="grid grid-cols-3 md:grid-cols-5 gap-3 font-mono text-[12px]">
            {#each Object.entries(s.kv) as [k, v]}
              <div>
                <div class="type-label">{k.replace(/_/g, ' ')}</div>
                <div class="text-fg-0 text-[15px] mt-0.5">{(v as number).toLocaleString()}</div>
              </div>
            {/each}
          </div>
        </Card>
      {/if}

      <!-- Replication -->
      {#if r}
        <Card title="replication">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[12px]">
            <div>
              <div class="type-label">role</div>
              <div class="mt-1"><NodeBadge role={r.role === 'replica' ? 'replica' : r.role === 'primary' ? 'primary' : 'embedded'} label={r.role} /></div>
            </div>
            <div>
              <div class="type-label">state</div>
              <div class="text-fg-0 mt-1">
                {#if r.state === 'healthy'}<Badge tone="ok">healthy</Badge>{:else if r.state}<Badge tone="warn">{r.state}</Badge>{:else}—{/if}
              </div>
            </div>
            {#if r.role === 'primary'}
              <div>
                <div class="type-label">wal lsn</div>
                <div class="text-fg-0 mt-1">{r.wal_lsn ?? '—'}</div>
              </div>
              <div>
                <div class="type-label">replicas</div>
                <div class="text-fg-0 mt-1">{r.replica_count ?? '—'}</div>
              </div>
            {:else if r.role === 'replica'}
              <div>
                <div class="type-label">applied lsn</div>
                <div class="text-fg-0 mt-1">{r.last_applied_lsn} / {r.last_seen_primary_lsn}</div>
              </div>
              <div>
                <div class="type-label">lag</div>
                <div class="text-fg-0 mt-1">
                  {#if r.last_applied_lsn !== undefined && r.last_seen_primary_lsn !== undefined}
                    {@const lag = r.last_seen_primary_lsn - r.last_applied_lsn}
                    {#if lag === 0}<Badge tone="ok">in sync</Badge>{:else}<Badge tone="warn">{lag} lsn</Badge>{/if}
                  {:else}—{/if}
                </div>
              </div>
            {/if}
          </div>
        </Card>
      {/if}

      <!-- System -->
      <Card title="system">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[12px]">
          <div>
            <div class="type-label">os/arch</div>
            <div class="text-fg-0 mt-1">{s.system.os} / {s.system.arch}</div>
          </div>
          <div>
            <div class="type-label">cpu cores</div>
            <div class="text-fg-0 mt-1">{s.system.cpu_cores}</div>
          </div>
          <div>
            <div class="type-label">total mem</div>
            <div class="text-fg-0 mt-1">{fmtBytes(s.system.total_memory_bytes)}</div>
          </div>
          <div>
            <div class="type-label">avail mem</div>
            <div class="text-fg-0 mt-1">{fmtBytes(s.system.available_memory_bytes)}</div>
          </div>
          <div>
            <div class="type-label">pid</div>
            <div class="text-fg-0 mt-1">{s.system.pid}</div>
          </div>
          <div>
            <div class="type-label">hostname</div>
            <div class="text-fg-0 mt-1">{s.system.hostname}</div>
          </div>
          <div>
            <div class="type-label">uptime</div>
            <div class="text-fg-0 mt-1">{Math.round((Date.now() - s.started_at_unix_ms) / 1000)}s</div>
          </div>
        </div>
      </Card>
    </div>
  {/if}
{/if}
