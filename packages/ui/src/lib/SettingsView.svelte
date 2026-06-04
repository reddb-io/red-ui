<script lang="ts">
  // Settings surface: a bounded pane shell backed by live SQL introspection.
  import { ListRow, NavItem, Pill, SectionHeading } from '@reddb-io/ui-kit'
  import {
    Download,
    FileJson,
    KeyRound,
    Link2,
    RefreshCw,
    Search,
    Settings2,
    ShieldOff,
    SlidersHorizontal,
    Unplug,
    type Icon,
  } from 'lucide-svelte'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { activity } from '$lib/activity.svelte'
  import { connection } from '$lib/connections.svelte'
  import { PermissionGate } from '$lib/permission-gate'
  import {
    SettingsAuthoringClient,
    type ConfigEntry,
    type SecretEntry,
    type SecretReference,
  } from '$lib/settings-authoring-client'
  import {
    SETTINGS_PANES,
    filterConfigEntries,
    filterSecretEntries,
    filterSettingsPanesByGrant,
    resolveConfigControl,
    resolvePane,
    resolveSecretControl,
    type ControlDescriptor,
    type SettingsPane,
  } from '$lib/settings-sections'

  const icons: Record<string, typeof Icon> = {
    key: KeyRound,
    settings: Settings2,
  }

  let activePaneId = $state(SETTINGS_PANES[0].id)
  let visiblePanes = $state<SettingsPane[]>([])
  let permissions = $state<PermissionGate | null>(null)
  let permissionsLoading = $state(false)
  let permissionError = $state<string | null>(null)
  let permissionRun = 0

  const hasVisiblePane = $derived(visiblePanes.length > 0)
  const activePane = $derived(resolvePane(activePaneId, visiblePanes))

  let queries = $state<Record<string, string>>({})
  let searchEl = $state<HTMLInputElement | null>(null)
  const query = $derived(hasVisiblePane ? (queries[activePane.id] ?? '') : '')

  let configEntries = $state<ConfigEntry[]>([])
  let secretEntries = $state<SecretEntry[]>([])
  let selectedConfigKey = $state<string | null>(null)
  let selectedSecretKey = $state<string | null>(null)
  let loading = $state(false)
  let configLoadError = $state<string | null>(null)
  let secretsLoadError = $state<string | null>(null)

  const connected = $derived(connection.connected)
  const activeUrl = $derived(connection.active.url)
  const loadError = $derived(activePane.id === 'secrets' ? secretsLoadError : configLoadError)
  const unreachable = $derived(!connected || loadError !== null)
  const configRows = $derived(filterConfigEntries(configEntries, query))
  const secretRows = $derived(filterSecretEntries(secretEntries, query))
  const activeRowCount = $derived(activePane.id === 'secrets' ? secretRows.length : configRows.length)
  const activeTotalCount = $derived(activePane.id === 'secrets' ? secretEntries.length : configEntries.length)
  const selectedEntry = $derived(
    configRows.find((entry) => entry.key === selectedConfigKey) ?? configRows[0] ?? null,
  )
  const selectedSecret = $derived(
    secretRows.find((entry) => entry.key === selectedSecretKey) ?? secretRows[0] ?? null,
  )
  const selectedControl = $derived(
    selectedEntry ? resolveConfigControl(selectedEntry) : null,
  )
  const selectedSecretControl = $derived(
    selectedSecret ? resolveSecretControl(selectedSecret) : null,
  )

  function setQuery(value: string) {
    if (!hasVisiblePane) return
    queries = { ...queries, [activePane.id]: value }
  }

  function onWindowKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchEl?.focus()
      searchEl?.select()
    }
  }

  async function refreshPermissions() {
    const client = connection.client
    const run = ++permissionRun
    permissions = null
    visiblePanes = []
    permissionError = null
    configEntries = []
    secretEntries = []
    selectedConfigKey = null
    selectedSecretKey = null

    if (!client || !connected) {
      permissionsLoading = false
      return
    }

    permissionsLoading = true
    const gate = new PermissionGate(client)
    try {
      await activity.track('settings · auth.can panes', () =>
        gate.preload(SETTINGS_PANES.map((pane) => pane.readGrant)),
      )
      if (run !== permissionRun) return

      permissions = gate
      const nextPanes = filterSettingsPanesByGrant(SETTINGS_PANES, gate)
      visiblePanes = nextPanes
      if (nextPanes.length > 0 && !nextPanes.some((pane) => pane.id === activePaneId)) {
        activePaneId = nextPanes[0].id
      }
    } catch (e) {
      if (run !== permissionRun) return
      visiblePanes = []
      permissions = null
      permissionError = (e as Error).message
    } finally {
      if (run === permissionRun) permissionsLoading = false
    }
  }

  async function refresh() {
    const client = connection.client
    const gate = permissions
    if (
      !client ||
      !connected ||
      !gate ||
      !hasVisiblePane ||
      !gate.cachedCan(activePane.readGrant)
    ) {
      configEntries = []
      secretEntries = []
      selectedConfigKey = null
      selectedSecretKey = null
      configLoadError = null
      secretsLoadError = null
      return
    }

    loading = true
    if (activePane.id === 'secrets') {
      secretsLoadError = null
    } else {
      configLoadError = null
    }
    try {
      const authoring = new SettingsAuthoringClient(client)
      if (activePane.id === 'secrets') {
        const next = await activity.track('settings · show secrets', () =>
          authoring.showSecrets(),
        )
        secretEntries = next
        if (!selectedSecretKey || !next.some((entry) => entry.key === selectedSecretKey)) {
          selectedSecretKey = next[0]?.key ?? null
        }
      } else {
        const next = await activity.track('settings · show config', () =>
          authoring.showConfig(),
        )
        configEntries = next
        if (!selectedConfigKey || !next.some((entry) => entry.key === selectedConfigKey)) {
          selectedConfigKey = next[0]?.key ?? null
        }
      }
    } catch (e) {
      if (activePane.id === 'secrets') {
        secretEntries = []
        selectedSecretKey = null
        secretsLoadError = (e as Error).message
      } else {
        configEntries = []
        selectedConfigKey = null
        configLoadError = (e as Error).message
      }
    } finally {
      loading = false
    }
  }

  $effect(() => {
    void activeUrl
    void connected
    refreshPermissions()
  })

  $effect(() => {
    void activeUrl
    void connected
    void activePaneId
    void permissions
    void visiblePanes
    refresh()
  })

  function formatBytes(n: number): string {
    if (!Number.isFinite(n)) return String(n)
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = n
    let i = 0
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024
      i++
    }
    return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`
  }

  function formatSecretReference(ref: SecretReference): string {
    if (ref.masked) return '&***'
    return `&${ref.collection ? `${ref.collection}.` : ''}${ref.key}`
  }

  function isSecretReferenceValue(value: unknown): value is SecretReference {
    return !!value && typeof value === 'object' && !Array.isArray(value) && 'type' in value && value.type === 'secret_ref'
  }

  function formatValue(entry: ConfigEntry): string {
    const value = entry.value
    if (isSecretReferenceValue(value)) return formatSecretReference(value)
    if (typeof value === 'number' && entry.key.endsWith('_bytes')) return formatBytes(value)
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
    if (value && typeof value === 'object') return JSON.stringify(value)
    if (value === null || value === undefined) return 'null'
    return String(value)
  }

  function formatLongValue(value: unknown): string {
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      return JSON.stringify(value, null, 2)
    }
    if (value === null || value === undefined) return 'null'
    return String(value)
  }

  function exportConfig() {
    const payload = {
      url: activeUrl,
      exportedAt: new Date().toISOString(),
      projection: 'SHOW CONFIG',
      config: configEntries.map((entry) => ({
        key: entry.key,
        value: entry.value,
        value_type: entry.valueType ?? null,
        schema_version: entry.schemaVersion ?? null,
      })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reddb-config-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function paneCount(pane: SettingsPane): number {
    if (pane.id === 'secrets') return secretEntries.length
    return configEntries.length
  }
</script>

<svelte:window onkeydown={onWindowKey} />

<div class="@container h-full min-h-0 bg-bg-0">
  <div
    class="grid h-full min-h-0 grid-cols-1 @min-[62rem]:grid-cols-[13rem_minmax(18rem,24rem)_minmax(0,1fr)]"
  >
    <aside
      class="flex min-h-0 flex-col border-b border-line-1 bg-bg-1 @min-[62rem]:border-b-0 @min-[62rem]:border-r"
    >
      <div class="border-b border-line-1 px-3 py-3">
        <div class="type-label">Settings</div>
        <div class="mt-1 text-[13px] text-fg-1">Governance surface</div>
      </div>
      <nav class="grid gap-0.5 p-2">
        {#each visiblePanes as pane (pane.id)}
          {@const PaneIcon = icons[pane.icon] ?? Settings2}
          <NavItem
            label={pane.label}
            active={pane.id === activePane.id}
            onclick={() => (activePaneId = pane.id)}
          >
            {#snippet icon()}<PaneIcon class="size-3.5" />{/snippet}
            {#snippet trailing()}<Pill>{paneCount(pane)}</Pill>{/snippet}
          </NavItem>
        {/each}
      </nav>
      <div class="mt-auto border-t border-line-1 px-3 py-2.5 text-[11px] text-fg-3">
        {#if permissionsLoading}
          checking grants
        {:else if hasVisiblePane}
          <span class="font-mono text-fg-2">{activeTotalCount}</span> live rows
        {:else}
          no readable panes
        {/if}
      </div>
    </aside>

    <section
      class="flex min-h-0 flex-col border-b border-line-1 bg-bg-1 @min-[62rem]:border-b-0 @min-[62rem]:border-r"
      aria-label={`${activePane.label} entries`}
    >
      <div class="border-b border-line-1 p-2">
        <div class="relative">
          <Search
            class="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-3"
          />
          <input
            bind:this={searchEl}
            type="text"
            placeholder={`Search ${activePane.label.toLowerCase()}  ⌘K`}
            value={query}
            disabled={permissionsLoading || !hasVisiblePane || unreachable}
            oninput={(e) => setQuery(e.currentTarget.value)}
            onkeydown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                e.currentTarget.blur()
              }
            }}
            class="h-7 w-full rounded-md border border-line-2 bg-bg-2 pl-8 pr-2.5 text-xs text-fg-1 placeholder:text-fg-3 outline-none transition-colors focus:border-line-3 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if permissionsLoading}
          <div class="grid gap-1 p-2">
            {#each Array(4) as _, i (i)}
              <div class="h-12 rounded-md bg-bg-2 motion-safe:animate-pulse"></div>
            {/each}
          </div>
        {:else if !hasVisiblePane}
          <EmptyState
            icon={ShieldOff}
            title={connected ? 'No readable settings panes' : 'No active connection'}
            message={connected
              ? 'The current principal has no Settings read grant.'
              : 'Connect to a reddb instance to inspect its live configuration.'}
            hint={permissionError ?? (connected ? 'auth.can denied settings reads' : 'red serve')}
          />
        {:else if unreachable}
          <EmptyState
            icon={Unplug}
            title={connected ? `${activePane.label} is unreachable` : 'No active connection'}
            message={connected
              ? `red-ui could not read ${activePane.id === 'secrets' ? 'SHOW SECRETS' : 'SHOW CONFIG'} from the active target.`
              : 'Connect to a reddb instance to inspect its live configuration.'}
            hint={connected ? loadError ?? activeUrl : 'red serve'}
          />
        {:else if loading && activeRowCount === 0}
          <div class="grid gap-1 p-2">
            {#each Array(8) as _, i (i)}
              <div class="h-12 rounded-md bg-bg-2 motion-safe:animate-pulse"></div>
            {/each}
          </div>
        {:else if activeRowCount === 0}
          <EmptyState
            icon={Search}
            title={query ? `No ${activePane.label.toLowerCase()} match` : `No ${activePane.label.toLowerCase()} reported`}
            message={query
              ? `Search checks the ${activePane.label.toLowerCase()} key and metadata.`
              : `${activePane.id === 'secrets' ? 'SHOW SECRETS' : 'SHOW CONFIG'} returned no rows for this connection.`}
          />
        {:else if activePane.id === 'secrets'}
          <div class="grid gap-1 p-2">
            {#each secretRows as entry (entry.key)}
              {@const control = resolveSecretControl(entry)}
              <div
                class={[
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 transition-colors',
                  selectedSecret?.key === entry.key
                    ? 'bg-bg-3 text-fg-0'
                    : 'text-fg-1 hover:bg-bg-2',
                ].join(' ')}
              >
                <button
                  type="button"
                  aria-current={selectedSecret?.key === entry.key ? 'page' : undefined}
                  onclick={() => (selectedSecretKey = entry.key)}
                  class="min-w-0 text-left"
                >
                  <span class="block truncate text-[13px]">{control.label}</span>
                  <span class="block truncate font-mono text-[11px] text-fg-3">{entry.key}</span>
                </button>

                <div class="inline-flex h-6 items-center gap-1.5 rounded border border-line-2 bg-bg-2 px-1.5 font-mono text-[11px] text-fg-2">
                  <KeyRound class="size-3" />
                  {entry.value}
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="grid gap-1 p-2">
            {#each configRows as entry (entry.key)}
              {@const control = resolveConfigControl(entry)}
              <div
                class={[
                  'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-2.5 py-2 transition-colors',
                  selectedEntry?.key === entry.key
                    ? 'bg-bg-3 text-fg-0'
                    : 'text-fg-1 hover:bg-bg-2',
                ].join(' ')}
              >
                <button
                  type="button"
                  aria-current={selectedEntry?.key === entry.key ? 'page' : undefined}
                  onclick={() => (selectedConfigKey = entry.key)}
                  class="min-w-0 text-left"
                >
                  <span class="block truncate text-[13px]">{control.label}</span>
                  <span class="block truncate font-mono text-[11px] text-fg-3">{entry.key}</span>
                </button>

                {#if control.kind === 'boolean'}
                  <label
                    class="inline-flex h-6 items-center gap-1.5 rounded border border-line-2 bg-bg-2 px-1.5 font-mono text-[11px] text-fg-2"
                  >
                    <input
                      type="checkbox"
                      checked={entry.value === true}
                      disabled
                      tabindex="-1"
                      class="size-3 accent-current"
                    />
                    {entry.value ? 'true' : 'false'}
                  </label>
                {:else if control.kind === 'enum'}
                  <select
                    disabled
                    tabindex="-1"
                    value={String(entry.value)}
                    class="h-6 w-28 rounded border border-line-2 bg-bg-2 px-1.5 font-mono text-[11px] text-accent disabled:opacity-100"
                    aria-label={control.label}
                  >
                    {#if !control.options?.includes(String(entry.value))}
                      <option value={String(entry.value)}>{formatValue(entry)}</option>
                    {/if}
                    {#each control.options ?? [] as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </select>
                {:else}
                  <input
                    readonly
                    tabindex="-1"
                    aria-label={control.label}
                    value={formatValue(entry)}
                    class="h-6 w-28 rounded border border-line-2 bg-bg-2 px-1.5 font-mono text-[11px] text-fg-2 outline-none"
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="grid gap-2 border-t border-line-1 px-3 py-2.5">
        {#if activePane.id === 'config'}
          <button
            type="button"
            onclick={exportConfig}
            disabled={permissionsLoading || !hasVisiblePane || loading || configEntries.length === 0}
            class="inline-flex h-7 items-center justify-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 transition-colors hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download class="size-3.5" />
            export config
          </button>
        {/if}
        <div class="truncate text-[11px] text-fg-3">
          {#if hasVisiblePane}
            Live from <span class="font-mono text-fg-2">{activeUrl}</span>.
          {:else}
            Requires a Settings read grant.
          {/if}
        </div>
      </div>
    </section>

    <main class="min-h-0 min-w-0 overflow-auto bg-bg-0">
      <div class="p-6">
        {#if permissionsLoading}
          <PageHeader eyebrow="Settings" title="Settings" subtitle="Checking Settings grants." />
          <EmptyState
            icon={ShieldOff}
            title="Checking settings grants"
            message="red-ui is asking reddb which Settings panes this principal can read."
            hint="POST /auth/can"
          />
        {:else if !hasVisiblePane}
          <PageHeader eyebrow="Settings" title="Settings" subtitle="No readable governance surface." />
          <EmptyState
            icon={ShieldOff}
            title={connected ? 'No readable settings panes' : 'No active connection'}
            message={connected
              ? 'Missing Settings read grant for this principal.'
              : 'Start or select a reddb target, then return here to inspect live config.'}
            hint={permissionError ?? (connected ? 'missing Settings read grant' : 'docker compose -f docker/compose.yml up -d')}
          />
        {:else}
          <PageHeader eyebrow="Settings" title={activePane.label} subtitle={activePane.blurb}>
          {#snippet actions()}
            <button
              type="button"
              onclick={refresh}
              disabled={loading || !connected}
              class="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-2 bg-bg-2 px-2.5 text-[11px] font-mono text-fg-1 hover:border-line-3 hover:text-fg-0 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw class={loading ? 'size-3.5 animate-spin' : 'size-3.5'} />
              refresh
            </button>
          {/snippet}
          </PageHeader>

          {#if unreachable}
          <EmptyState
            icon={Unplug}
            title={connected ? `Unable to read ${activePane.label.toLowerCase()}` : 'No active connection'}
            message={connected
              ? `The ${activePane.label} pane is intentionally empty because ${activePane.id === 'secrets' ? 'SHOW SECRETS' : 'SHOW CONFIG'} did not complete.`
              : 'Start or select a reddb target, then return here to inspect live config.'}
            hint={connected ? loadError ?? activeUrl : 'docker compose -f docker/compose.yml up -d'}
          />
          {:else if activePane.id === 'secrets'}
            {#if !selectedSecret || !selectedSecretControl}
              <EmptyState
                icon={KeyRound}
                title="No secret selected"
                message="Select a live SHOW SECRETS row to inspect its masked metadata."
              />
            {:else}
              <section>
                <SectionHeading title={selectedSecretControl.label} class="mb-2">
                  {#snippet icon()}<KeyRound class="size-3.5" />{/snippet}
                  {#snippet meta()}<Pill>masked</Pill>{/snippet}
                </SectionHeading>

                <div class="divide-y divide-line-1 overflow-hidden rounded-lg border border-line-1 bg-bg-1">
                  <ListRow
                    title={selectedSecretControl.label}
                    description="Vault metadata row; plaintext is not available in this pane."
                    hint={selectedSecret.key}
                    wide
                  >
                    {#snippet action()}
                      <input
                        readonly
                        value={selectedSecret.value}
                        aria-label={selectedSecretControl.label}
                        class="h-8 w-full rounded-md border border-line-2 bg-bg-2 px-2.5 font-mono text-[12px] text-fg-1 outline-none"
                      />
                    {/snippet}
                  </ListRow>

                  <ListRow title="Key" hint={selectedSecret.key}>
                    {#snippet action()}
                      <span class="font-mono text-[12px] text-fg-1">{selectedSecret.key}</span>
                    {/snippet}
                  </ListRow>

                  <ListRow title="Metadata">
                    {#snippet action()}
                      <div class="flex flex-wrap justify-end gap-1.5">
                        <Pill>{selectedSecret.status ?? 'status unknown'}</Pill>
                        <Pill
                          >version {selectedSecret.version === undefined
                            ? 'unknown'
                            : selectedSecret.version}</Pill
                        >
                      </div>
                    {/snippet}
                  </ListRow>
                </div>
              </section>
            {/if}
          {:else if !selectedEntry || !selectedControl}
          <EmptyState
            icon={FileJson}
            title="No config entry selected"
            message="Select a live SHOW CONFIG row to inspect its read-only control."
          />
          {:else}
          <section>
            <SectionHeading title={selectedControl.label} class="mb-2">
              {#snippet icon()}
                {#if selectedControl.kind === 'secret-reference'}
                  <Link2 class="size-3.5" />
                {:else}
                  <SlidersHorizontal class="size-3.5" />
                {/if}
              {/snippet}
              {#snippet meta()}<Pill>{selectedControl.kind}</Pill>{/snippet}
            </SectionHeading>

            <div class="divide-y divide-line-1 overflow-hidden rounded-lg border border-line-1 bg-bg-1">
              <ListRow
                title={selectedControl.label}
                description={selectedControl.description}
                hint={selectedEntry.key}
                wide
              >
                {#snippet action()}
                  {#if selectedControl.kind === 'boolean'}
                    <label
                      class="inline-flex h-8 items-center gap-2 rounded-md border border-line-2 bg-bg-2 px-2.5 font-mono text-[12px] text-fg-1"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEntry.value === true}
                        disabled
                        class="size-3 accent-current"
                      />
                      {selectedEntry.value ? 'true' : 'false'}
                    </label>
                  {:else if selectedControl.kind === 'enum'}
                    <select
                      disabled
                      value={String(selectedEntry.value)}
                      class="h-8 min-w-[12rem] rounded-md border border-line-2 bg-bg-2 px-2.5 font-mono text-[12px] text-fg-1 disabled:opacity-100"
                    >
                      {#if !selectedControl.options?.includes(String(selectedEntry.value))}
                        <option value={String(selectedEntry.value)}>{formatValue(selectedEntry)}</option>
                      {/if}
                      {#each selectedControl.options ?? [] as option}
                        <option value={option}>{option}</option>
                      {/each}
                    </select>
                  {:else if selectedControl.kind === 'list'}
                    <textarea
                      readonly
                      rows="5"
                      value={formatLongValue(selectedEntry.value)}
                      class="min-h-24 w-full resize-y rounded-md border border-line-2 bg-bg-2 px-2.5 py-2 font-mono text-[12px] text-fg-1 outline-none"
                    ></textarea>
                  {:else}
                    <input
                      readonly
                      type={selectedControl.kind === 'number' ? 'text' : 'text'}
                      value={formatValue(selectedEntry)}
                      class="h-8 w-full rounded-md border border-line-2 bg-bg-2 px-2.5 font-mono text-[12px] text-fg-1 outline-none"
                    />
                  {/if}
                {/snippet}
              </ListRow>

              <ListRow title="Key" hint={selectedEntry.key}>
                {#snippet action()}
                  <span class="font-mono text-[12px] text-fg-1">{selectedEntry.key}</span>
                {/snippet}
              </ListRow>

              <ListRow title="Schema">
                {#snippet action()}
                  <div class="flex flex-wrap justify-end gap-1.5">
                    <Pill>{selectedControl.valueType ?? 'runtime type'}</Pill>
                    <Pill
                      >schema {selectedControl.schemaVersion === undefined
                        ? 'unknown'
                        : selectedControl.schemaVersion}</Pill
                    >
                  </div>
                {/snippet}
              </ListRow>
            </div>
          </section>
          {/if}
        {/if}
      </div>
    </main>
  </div>
</div>
