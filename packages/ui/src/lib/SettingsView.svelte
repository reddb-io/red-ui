<script lang="ts">
  // Settings view — a data-driven, permission-aware config inspector.
  //
  // The sections, their curated keys, and the label/description/enum copy all
  // live in `settings-sections` as DATA. This view does three things: reads the
  // *real* config from `connection.client` (no mocks/fixtures), flattens it to
  // dotted keys, and renders each curated key through `resolveControl` as a
  // `ListRow`. When the connection is unreachable it falls back to EmptyState.
  //
  // Permission-aware by default: a key whose source endpoint is denied or
  // unsupported is not greyed out — its control is absent, replaced by a small
  // chip naming the missing grant (with the server's reason in the tooltip).
  import {
    SplitView,
    NavItem,
    SectionHeading,
    Pill,
    ListRow,
  } from '@reddb-io/ui-kit'
  import {
    Settings2,
    Database,
    Network,
    Plug,
    Shield,
    Search,
    RefreshCw,
    Download,
    Lock,
    Unplug,
    type Icon,
  } from 'lucide-svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { connection } from '$lib/connections.svelte'
  import { activity } from '$lib/activity.svelte'
  import {
    SECTIONS,
    resolveSection,
    resolveControl,
    sourceForKey,
    flattenConfig,
    filterKeys,
    type ControlDescriptor,
    type SettingsSource,
  } from '$lib/settings-sections'

  const icons: Record<string, typeof Icon> = {
    settings: Settings2,
    database: Database,
    network: Network,
    plug: Plug,
    shield: Shield,
  }

  // The grant a denied source is gated on — shown on the "absent" chip.
  const GRANTS: Record<SettingsSource, string> = {
    stats: 'stats:read',
    cluster: 'cluster:status',
    capabilities: 'capabilities',
    session: 'auth:whoami',
  }

  let activeId = $state(SECTIONS[0].id)
  const active = $derived(resolveSection(activeId))

  // Per-section search query, keyed by section id, so switching tabs preserves
  // each section's typed query. The input is focusable via the ⌘K idiom.
  let queries = $state<Record<string, string>>({})
  let searchEl = $state<HTMLInputElement | null>(null)
  const query = $derived(queries[activeId] ?? '')

  function setQuery(v: string) {
    queries = { ...queries, [activeId]: v }
  }

  function onWindowKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchEl?.focus()
      searchEl?.select()
    }
  }

  // Flattened live config and, per source, the reason its grant is absent
  // (null ⇒ available). Both are rebuilt atomically on every refresh.
  let values = $state<Record<string, unknown>>({})
  let denied = $state<Record<SettingsSource, string | null>>({
    stats: null,
    cluster: null,
    capabilities: null,
    session: null,
  })
  let loading = $state(false)

  const connected = $derived(connection.connected)
  const activeUrl = $derived(connection.active.url)

  async function refresh() {
    const client = connection.client
    if (!client || !connected) {
      values = {}
      return
    }
    loading = true
    const next: Record<string, unknown> = {}
    const nextDenied: Record<SettingsSource, string | null> = {
      stats: null,
      cluster: null,
      capabilities: null,
      session: null,
    }

    // /capabilities is the negotiation itself — always available from the store.
    Object.assign(next, flattenConfig({ capabilities: connection.capabilities }))

    try {
      const stats = await activity.track('settings · stats', () => client.stats())
      Object.assign(next, flattenConfig(stats as unknown as Record<string, unknown>))
    } catch (e) {
      nextDenied.stats = (e as Error).message
    }

    // Cluster topology is capability-gated: if the server can't honour
    // /cluster/status, those keys are absent + explained, never faked.
    if (!connection.capabilities.clusterStatus) {
      nextDenied.cluster = 'Server does not expose /cluster/status.'
    } else {
      try {
        const cluster = await activity.track('settings · cluster', () =>
          client.clusterStatus(),
        )
        Object.assign(next, flattenConfig(cluster as unknown as Record<string, unknown>))
      } catch (e) {
        nextDenied.cluster = (e as Error).message
      }
    }

    try {
      const session = await activity.track('settings · whoami', () => client.whoami())
      Object.assign(
        next,
        flattenConfig({ session: session as unknown as Record<string, unknown> }),
      )
    } catch (e) {
      nextDenied.session = (e as Error).message
    }

    values = next
    denied = nextDenied
    loading = false
  }

  $effect(() => {
    void activeUrl
    void connected
    refresh()
  })

  type RenderRow =
    | { type: 'value'; key: string; label: string; control: ControlDescriptor; value: unknown }
    | { type: 'denied'; key: string; label: string; reason: string; grant: string }

  // Resolve the active section's curated keys to render rows. A key whose
  // source is denied becomes a "denied" row (absent control + explanation); a
  // key with a live value becomes a "value" row; a key the server simply does
  // not report is dropped (graceful degradation — no empty placeholder).
  const rows = $derived.by<RenderRow[]>(() => {
    const out: RenderRow[] = []
    for (const key of filterKeys(active.keys, query)) {
      const src = sourceForKey(key)
      const reason = denied[src]
      const label = resolveControl(key).label
      if (reason) {
        out.push({ type: 'denied', key, label, reason, grant: GRANTS[src] })
      } else if (key in values) {
        out.push({
          type: 'value',
          key,
          label,
          control: resolveControl(key, values[key]),
          value: values[key],
        })
      }
    }
    return out
  })

  function formatBytes(n: number): string {
    if (!Number.isFinite(n)) return String(n)
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let v = n
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024
      i++
    }
    return `${i === 0 ? v : v.toFixed(1)} ${units[i]}`
  }

  function formatValue(control: ControlDescriptor, value: unknown): string {
    if (control.kind === 'number' && control.key.endsWith('_bytes')) {
      return formatBytes(Number(value))
    }
    return String(value)
  }

  // Export the live config snapshot (what's currently inspected) as JSON. This
  // is the honest, real action: the snapshot is read from connection.client, so
  // it can be downloaded but NOT written back (the client exposes no config
  // write/reset). Import/reset would have no real target here, so they are
  // intentionally not offered rather than faked.
  function exportConfig() {
    const payload = {
      url: activeUrl,
      exportedAt: new Date().toISOString(),
      config: values,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reddb-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
</script>

<svelte:window onkeydown={onWindowKey} />

{#if !connected}
  <div class="h-full overflow-auto bg-bg-0 p-6">
    <PageHeader
      eyebrow="Settings"
      title="Settings"
      subtitle="Live configuration for the active reddb connection."
    />
    <EmptyState
      icon={Unplug}
      title="No active connection"
      message="Connect to a reddb instance to inspect its live configuration."
      hint="red serve"
    />
  </div>
{:else}
  <SplitView searchShortcut={null}>
    {#snippet search()}
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-3"
        />
        <input
          bind:this={searchEl}
          type="text"
          placeholder="Search this section  ⌘K"
          value={query}
          oninput={(e) => setQuery(e.currentTarget.value)}
          onkeydown={(e) => {
            if (e.key === 'Escape') {
              setQuery('')
              e.currentTarget.blur()
            }
          }}
          class="h-7 w-full rounded-md border border-line-2 bg-bg-2 pl-8 pr-2.5 text-xs text-fg-1 placeholder:text-fg-3 outline-none transition-colors focus:border-line-3"
        />
      </div>
    {/snippet}

    {#snippet nav()}
      <nav class="grid gap-0.5 p-2">
        {#each SECTIONS as section (section.id)}
          {@const SectionIcon = icons[section.icon] ?? Settings2}
          <NavItem
            label={section.label}
            active={section.id === active.id}
            onclick={() => (activeId = section.id)}
          >
            {#snippet icon()}<SectionIcon class="size-3.5" />{/snippet}
          </NavItem>
        {/each}
      </nav>
    {/snippet}

    {#snippet footer()}
      <div class="grid gap-2 px-3 py-2.5">
        <button
          type="button"
          onclick={exportConfig}
          disabled={loading}
          class="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 transition-colors hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download class="size-3.5" />
          export config
        </button>
        <div class="text-[11px] text-fg-3">
          Live from <span class="font-mono text-fg-2">{activeUrl}</span>.
        </div>
      </div>
    {/snippet}

    {#snippet content()}
      {@const SectionIcon = icons[active.icon] ?? Settings2}
      <div class="p-6">
        <PageHeader eyebrow="Settings" title={active.label} subtitle={active.blurb}>
          {#snippet actions()}
            <button
              type="button"
              onclick={refresh}
              disabled={loading}
              class="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw class={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
              refresh
            </button>
          {/snippet}
        </PageHeader>

        <section class="mb-6">
          <SectionHeading title={active.label} class="mb-2">
            {#snippet icon()}<SectionIcon class="size-3.5" />{/snippet}
            {#snippet meta()}<Pill>{rows.length}</Pill>{/snippet}
          </SectionHeading>

          {#if rows.length === 0}
            <div
              class="rounded-lg border border-dashed border-line-1 bg-bg-1 px-3 py-6 text-center text-[12px] text-fg-3"
            >
              This server reports nothing for these keys.
            </div>
          {:else}
            <div
              class="divide-y divide-line-1 overflow-hidden rounded-lg border border-line-1 bg-bg-1"
            >
              {#each rows as row (row.key)}
                {#if row.type === 'denied'}
                  <ListRow title={row.label} hint={row.key}>
                    {#snippet action()}
                      <span
                        class="inline-flex items-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2 py-1 text-[11px] font-mono text-fg-3"
                        title={row.reason}
                      >
                        <Lock class="size-3" />
                        requires {row.grant}
                      </span>
                    {/snippet}
                  </ListRow>
                {:else}
                  <ListRow
                    title={row.label}
                    description={row.control.description}
                    hint={row.key}
                  >
                    {#snippet action()}
                      {#if row.control.kind === 'boolean'}
                        <Pill tone={row.value ? 'accent' : 'muted'}>{row.value ? 'on' : 'off'}</Pill>
                      {:else if row.control.kind === 'enum'}
                        <span
                          class="font-mono text-[12px] text-accent"
                          title={`Options: ${row.control.options?.join(', ')}`}
                        >{row.value}</span>
                      {:else}
                        <span class="font-mono text-[12px] text-fg-1"
                          >{formatValue(row.control, row.value)}</span
                        >
                      {/if}
                    {/snippet}
                  </ListRow>
                {/if}
              {/each}
            </div>
          {/if}
        </section>
      </div>
    {/snippet}
  </SplitView>
{/if}
