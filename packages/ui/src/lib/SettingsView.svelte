<script lang="ts">
  import { Icon as DSIcon } from '@reddb-io/design-system/base'
  import { useWorkspace } from './workspace-context'
  // Settings surface: a bounded pane shell backed by live SQL introspection.
  import { NavItem, Pill, SettingsRow } from '@reddb-io/design-system/app'
  import { AlertDialog, Button, Checkbox, Input, Select, Textarea, Icon as DsIcon, SectionHeading, type IconGlyph } from '@reddb-io/design-system/base'
  import AlertCircle from '@lucide/svelte/icons/alert-circle'
  import Download from '@lucide/svelte/icons/download'
  import KeyRound from '@lucide/svelte/icons/key-round'
  import Eye from '@lucide/svelte/icons/eye'
  import EyeOff from '@lucide/svelte/icons/eye-off'
  import Link2 from '@lucide/svelte/icons/link-2'
  import Plus from '@lucide/svelte/icons/plus'
  import RefreshCw from '@lucide/svelte/icons/refresh-cw'
  import Search from '@lucide/svelte/icons/search'
  import Save from '@lucide/svelte/icons/save'
  import Settings2 from '@lucide/svelte/icons/settings-2'
  import ShieldOff from '@lucide/svelte/icons/shield-off'
  import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { accessLocked, connectionLost, integrationEmpty, searchEmpty, collectionEmpty } from '@reddb-io/design-system/base/illustrations'

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
    initialConfigEditValue,
    parseConfigEditValue,
    resolveConfigControl,
    resolvePane,
    resolveSecretControl,
    type ControlDescriptor,
    type SettingsPane,
  } from '$lib/settings-sections'

  const workspace = useWorkspace()
  const { activity, connection } = workspace

  const icons: Record<string, IconGlyph> = {
    key: KeyRound,
    settings: Settings2,
  }

  let confirmation = $state<{ title: string; run: () => unknown } | null>(null)

  let activePaneId = $state(SETTINGS_PANES[0].id)
  let visiblePanes = $state<SettingsPane[]>([])
  let permissions = $state<PermissionGate | null>(null)
  let permissionsLoading = $state(false)
  let permissionError = $state<string | null>(null)
  let permissionRun = 0

  const hasVisiblePane = $derived(visiblePanes.length > 0)
  const activePane = $derived(resolvePane(activePaneId, visiblePanes))

  let queries = $state<Record<string, string>>({})
  const query = $derived(hasVisiblePane ? (queries[activePane.id] ?? '') : '')

  let configEntries = $state<ConfigEntry[]>([])
  let secretEntries = $state<SecretEntry[]>([])
  let selectedConfigKey = $state<string | null>(null)
  let selectedSecretKey = $state<string | null>(null)
  let loading = $state(false)
  let configLoadError = $state<string | null>(null)
  let secretsLoadError = $state<string | null>(null)
  let writing = $state(false)
  let writeStatus = $state<{
    tone: 'ok' | 'error'
    message: string
    paneId: string
  } | null>(null)
  let editingConfigKey = $state<string | null>(null)
  let editValue = $state('')
  let newConfigKey = $state('')
  let newConfigKind = $state<'text' | 'number' | 'boolean' | 'list'>('text')
  let newConfigValue = $state('')
  let editingSecretSelectionKey = $state<string | null>(null)
  let secretWriteKey = $state('')
  let secretWriteValue = $state('')
  let revealing = $state(false)
  let revealStatus = $state<{
    tone: 'ok' | 'error'
    message: string
    key: string
  } | null>(null)
  let revealedSecret = $state<{
    key: string
    value: string
  } | null>(null)
  let revealTimer: ReturnType<typeof setTimeout> | null = null

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
  const canWriteConfig = $derived(
    activePane.id === 'config' &&
      !!activePane.writeGrant &&
      permissions?.cachedCan(activePane.writeGrant) === true,
  )
  const canWriteSecrets = $derived(
    activePane.id === 'secrets' &&
      !!activePane.writeGrant &&
      permissions?.cachedCan(activePane.writeGrant) === true,
  )
  const canRevealSecrets = $derived(
    activePane.id === 'secrets' &&
      !!activePane.revealGrant &&
      permissions?.cachedCan(activePane.revealGrant) === true,
  )
  const selectedSecretPlaintext = $derived(
    selectedSecret && revealedSecret?.key === selectedSecret.key ? revealedSecret.value : null,
  )

  function setQuery(value: string) {
    if (!hasVisiblePane) return
    queries = { ...queries, [activePane.id]: value }
  }

  function setWriteStatus(paneId: string, tone: 'ok' | 'error', message: string) {
    writeStatus = { paneId, tone, message }
  }

  function clearRevealedSecret() {
    if (revealTimer) {
      clearTimeout(revealTimer)
      revealTimer = null
    }
    revealedSecret = null
  }

  function showRevealedSecret(key: string, value: string) {
    clearRevealedSecret()
    revealedSecret = { key, value }
    revealTimer = setTimeout(() => {
      revealedSecret = null
      revealTimer = null
    }, 30_000)
  }

  function selectSecretKey(key: string) {
    if (selectedSecretKey !== key) clearRevealedSecret()
    selectedSecretKey = key
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
    writeStatus = null
    editingConfigKey = null
    editingSecretSelectionKey = null
    secretWriteKey = ''
    secretWriteValue = ''
    revealStatus = null
    clearRevealedSecret()

    if (!client || !connected) {
      permissionsLoading = false
      return
    }

    permissionsLoading = true
    const gate = new PermissionGate(client)
    try {
      await activity.track('settings · auth.can panes', () =>
        gate.preload(
          SETTINGS_PANES.flatMap((pane) =>
            [pane.readGrant, pane.writeGrant, pane.revealGrant].filter(
              (check): check is NonNullable<typeof check> => !!check,
            ),
          ),
        ),
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
      revealStatus = null
      clearRevealedSecret()
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

  function parseNewConfigValue() {
    return parseConfigEditValue(
      {
        key: newConfigKey,
        label: newConfigKey,
        kind: newConfigKind,
      },
      newConfigKind === 'boolean' && !newConfigValue.trim() ? 'false' : newConfigValue,
    )
  }

  async function saveSelectedConfig() {
    const client = connection.client
    if (!client || !selectedEntry || !selectedControl || !canWriteConfig || writing) return

    const parsed = parseConfigEditValue(selectedControl, editValue)
    if (!parsed.ok) {
      setWriteStatus('config', 'error', parsed.error ?? 'Invalid config value.')
      return
    }

    writing = true
    writeStatus = null
    try {
      const authoring = new SettingsAuthoringClient(client)
      await activity.track('settings · set config', () =>
        authoring.setConfig(selectedEntry.key, parsed.value ?? null),
      )
      selectedConfigKey = selectedEntry.key
      setWriteStatus('config', 'ok', `${selectedEntry.key} saved.`)
      await refresh()
    } catch (e) {
      setWriteStatus('config', 'error', (e as Error).message)
    } finally {
      writing = false
    }
  }

  async function unsetSelectedConfig(confirmed = false) {
    const client = connection.client
    if (!client || !selectedEntry || !canWriteConfig || writing) return
    if (!confirmed) {
      const key = selectedEntry.key
      confirmation = { title: `Unset ${key}?`, run: () => selectedEntry?.key === key ? unsetSelectedConfig(true) : undefined }
      return
    }

    const key = selectedEntry.key
    writing = true
    writeStatus = null
    try {
      const authoring = new SettingsAuthoringClient(client)
      await activity.track('settings · delete config', () => authoring.unsetConfig(key))
      selectedConfigKey = key
      setWriteStatus('config', 'ok', `${key} unset.`)
      await refresh()
    } catch (e) {
      setWriteStatus('config', 'error', (e as Error).message)
    } finally {
      writing = false
    }
  }

  async function setNewConfig() {
    const client = connection.client
    if (!client || !canWriteConfig || writing) return

    const parsed = parseNewConfigValue()
    if (!parsed.ok) {
      setWriteStatus('config', 'error', parsed.error ?? 'Invalid config value.')
      return
    }

    const key = newConfigKey.trim()
    writing = true
    writeStatus = null
    try {
      const authoring = new SettingsAuthoringClient(client)
      await activity.track('settings · set config', () =>
        authoring.setConfig(key, parsed.value ?? null),
      )
      selectedConfigKey = key
      newConfigKey = ''
      newConfigValue = ''
      setWriteStatus('config', 'ok', `${key} set.`)
      await refresh()
    } catch (e) {
      setWriteStatus('config', 'error', (e as Error).message)
    } finally {
      writing = false
    }
  }

  async function setSecretValue() {
    const client = connection.client
    if (!client || !canWriteSecrets || writing) return

    const key = secretWriteKey.trim()
    const value = secretWriteValue
    if (!key) {
      setWriteStatus('secrets', 'error', 'Secret key is required.')
      return
    }
    if (!value) {
      setWriteStatus('secrets', 'error', 'Secret value is required.')
      return
    }

    writing = true
    writeStatus = null
    try {
      const authoring = new SettingsAuthoringClient(client)
      await activity.track('settings · set secret', () => authoring.setSecret(key, value))
      selectedSecretKey = key
      secretWriteValue = ''
      setWriteStatus('secrets', 'ok', `${key} set.`)
      await refresh()
    } catch (e) {
      secretWriteValue = ''
      setWriteStatus('secrets', 'error', (e as Error).message)
    } finally {
      writing = false
    }
  }

  async function deleteSelectedSecret(confirmed = false) {
    const client = connection.client
    if (!client || !selectedSecret || !canWriteSecrets || writing) return
    if (!confirmed) {
      const key = selectedSecret.key
      confirmation = { title: `Delete secret ${key}?`, run: () => selectedSecret?.key === key ? deleteSelectedSecret(true) : undefined }
      return
    }

    const key = selectedSecret.key
    writing = true
    writeStatus = null
    try {
      const authoring = new SettingsAuthoringClient(client)
      await activity.track('settings · delete secret', () => authoring.deleteSecret(key))
      secretWriteValue = ''
      selectedSecretKey = key
      setWriteStatus('secrets', 'ok', `${key} deleted.`)
      await refresh()
    } catch (e) {
      secretWriteValue = ''
      setWriteStatus('secrets', 'error', (e as Error).message)
    } finally {
      writing = false
    }
  }

  async function revealSelectedSecret() {
    const client = connection.client
    if (!client || !selectedSecret || !canRevealSecrets || revealing) return

    const key = selectedSecret.key
    revealing = true
    revealStatus = null
    clearRevealedSecret()
    try {
      const authoring = new SettingsAuthoringClient(client)
      const revealed = await activity.track('settings · reveal secret', () =>
        authoring.revealSecret(key),
      )
      showRevealedSecret(revealed.key, revealed.value)
      revealStatus = {
        tone: 'ok',
        key,
        message: 'Plaintext revealed temporarily.',
      }
    } catch (e) {
      revealStatus = {
        tone: 'error',
        key,
        message: (e as Error).message,
      }
    } finally {
      revealing = false
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

  $effect(() => {
    if (!selectedEntry) {
      editingConfigKey = null
      editValue = ''
      return
    }
    if (editingConfigKey !== selectedEntry.key) {
      editingConfigKey = selectedEntry.key
      editValue = initialConfigEditValue(selectedEntry)
      writeStatus = null
    }
  })

  $effect(() => {
    if (activePane.id !== 'secrets' || !selectedSecret) return
    if (
      editingSecretSelectionKey !== selectedSecret.key &&
      (!secretWriteKey.trim() || secretWriteKey === editingSecretSelectionKey)
    ) {
      secretWriteKey = selectedSecret.key
      editingSecretSelectionKey = selectedSecret.key
      writeStatus = null
    }
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

<div class="@container h-full min-h-0 bg-background">
  <div
    class="grid h-full min-h-0 grid-cols-1 @min-[62rem]:grid-cols-[13rem_minmax(18rem,24rem)_minmax(0,1fr)]"
  >
    <aside
      class="flex min-h-0 flex-col border-b border-muted bg-elevation-base-surface @min-[62rem]:border-b-0 @min-[62rem]:border-r"
    >
      <div class="border-b border-muted px-3 py-3">
        <div class="type-label">Settings</div>
        <div class="mt-1 text-[13px] text-foreground">Governance surface</div>
      </div>
      <nav class="grid gap-0.5 p-2">
        {#each visiblePanes as pane (pane.id)}
          {@const PaneIcon = icons[pane.icon] ?? Settings2}
          <NavItem
            label={pane.label}
            current={pane.id === activePane.id}
            onclick={() => (activePaneId = pane.id)}
          >
            {#snippet icon()}<DsIcon icon={PaneIcon} size="sm" />{/snippet}
            {#snippet trailing()}<Pill>{paneCount(pane)}</Pill>{/snippet}
          </NavItem>
        {/each}
      </nav>
      <div class="mt-auto border-t border-muted px-3 py-2.5 text-[11px] text-ink-muted">
        {#if permissionsLoading}
          checking grants
        {:else if hasVisiblePane}
          <span class="font-mono text-ink-muted">{activeTotalCount}</span> live rows
        {:else}
          no readable panes
        {/if}
      </div>
    </aside>

    <section
      class="flex min-h-0 flex-col border-b border-muted bg-elevation-base-surface @min-[62rem]:border-b-0 @min-[62rem]:border-r"
      aria-label={`${activePane.label} entries`}
    >
      <div class="border-b border-muted p-2">
        <div class="relative">
          <DSIcon icon={Search} color="current"
            class="pointer-events-none absolute left-2.5 top-1/2  -translate-y-1/2 text-ink-muted"
          />
          <Input
            type="text"
            placeholder={`Search ${activePane.label.toLowerCase()}`}
            value={query}
            disabled={permissionsLoading || !hasVisiblePane || unreachable}
            oninput={(e) => setQuery(e.currentTarget.value)}
            onkeydown={(e) => {
              if (e.key === 'Escape') {
                setQuery('')
                e.currentTarget.blur()
              }
            }}
            class="font-mono w-full" controlSize="sm" aria-label="Search settings"
          />
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto">
        {#if permissionsLoading}
          <div class="grid gap-1 p-2">
            {#each Array(4) as _, i (i)}
              <div class="h-12 rounded-md bg-muted motion-safe:animate-pulse"></div>
            {/each}
          </div>
        {:else if !hasVisiblePane}
          <EmptyState
            illustration={connected ? accessLocked : integrationEmpty}
            illustrationSize="sm"
            title={connected ? 'No readable settings panes' : 'No active connection'}
            message={connected
              ? 'The current principal has no Settings read grant.'
              : 'Connect to a reddb instance to inspect its live configuration.'}
            hint={permissionError ?? (connected ? 'auth.can denied settings reads' : 'red serve')}
          />
        {:else if unreachable}
          <EmptyState
            illustration={connectionLost}
            illustrationSize="sm"
            title={connected ? `${activePane.label} is unreachable` : 'No active connection'}
            message={connected
              ? `red-ui could not read ${activePane.id === 'secrets' ? 'SHOW SECRETS' : 'SHOW CONFIG'} from the active target.`
              : 'Connect to a reddb instance to inspect its live configuration.'}
            hint={connected ? loadError ?? activeUrl : 'red serve'}
          />
        {:else if loading && activeRowCount === 0}
          <div class="grid gap-1 p-2">
            {#each Array(8) as _, i (i)}
              <div class="h-12 rounded-md bg-muted motion-safe:animate-pulse"></div>
            {/each}
          </div>
        {:else if activeRowCount === 0}
          <EmptyState
            illustration={query ? searchEmpty : collectionEmpty}
            illustrationSize="sm"
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
                    ? 'bg-elevation-raised-surface text-foreground'
                    : 'text-foreground hover:bg-muted',
                ].join(' ')}
              >
                <Button
                  type="button"
                  aria-current={selectedSecret?.key === entry.key ? 'page' : undefined}
                  onclick={() => selectSecretKey(entry.key)}
                  class="font-mono min-w-0 flex-col items-start" size="sm" variant="ghost"
                >
                  <span class="block truncate text-[13px]">{control.label}</span>
                  <span class="block truncate font-mono text-[11px] text-ink-muted">{entry.key}</span>
                </Button>

                <div class="inline-flex h-6 items-center gap-1.5 rounded border border-control-edge bg-muted px-1.5 font-mono text-[11px] text-ink-muted">
                  <DSIcon icon={KeyRound} color="current" class="" />
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
                    ? 'bg-elevation-raised-surface text-foreground'
                    : 'text-foreground hover:bg-muted',
                ].join(' ')}
              >
                <Button
                  type="button"
                  aria-current={selectedEntry?.key === entry.key ? 'page' : undefined}
                  onclick={() => (selectedConfigKey = entry.key)}
                  class="font-mono min-w-0 flex-col items-start" size="sm" variant="ghost"
                >
                  <span class="block truncate text-[13px]">{control.label}</span>
                  <span class="block truncate font-mono text-[11px] text-ink-muted">{entry.key}</span>
                </Button>

                {#if control.kind === 'boolean'}
                  <Checkbox label={entry.value ? 'true' : 'false'} aria-label={`${control.label}: ${entry.value ? 'true' : 'false'}`} checked={entry.value === true} disabled tabindex={-1} />
                {:else if control.kind === 'enum'}
                  <Select
                    disabled
                    tabindex={-1}
                    value={String(entry.value)}
                    class="font-mono w-28" controlSize="sm"
                    aria-label={control.label}
                  >
                    {#if !control.options?.includes(String(entry.value))}
                      <option value={String(entry.value)}>{formatValue(entry)}</option>
                    {/if}
                    {#each control.options ?? [] as option}
                      <option value={option}>{option}</option>
                    {/each}
                  </Select>
                {:else}
                  <Input
                    readonly
                    tabindex={-1}
                    aria-label={control.label}
                    value={formatValue(entry)}
                    class="font-mono w-28" controlSize="sm"
                  />
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="grid gap-2 border-t border-muted px-3 py-2.5">
        {#if activePane.id === 'config'}
          <Button
            type="button"
            onclick={exportConfig}
            disabled={permissionsLoading || !hasVisiblePane || loading || configEntries.length === 0}
            class="font-mono" size="sm"
          >
            <DSIcon icon={Download} color="current" class="" />
            export config
          </Button>
        {/if}
        <div class="truncate text-[11px] text-ink-muted">
          {#if hasVisiblePane}
            Live from <span class="font-mono text-ink-muted">{activeUrl}</span>.
          {:else}
            Requires a Settings read grant.
          {/if}
        </div>
      </div>
    </section>

    <div class="min-h-0 min-w-0 overflow-auto bg-background">
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
            illustration={connected ? accessLocked : integrationEmpty}
            illustrationSize="sm"
            title={connected ? 'No readable settings panes' : 'No active connection'}
            message={connected
              ? 'Missing Settings read grant for this principal.'
              : 'Start or select a reddb target, then return here to inspect live config.'}
            hint={permissionError ?? (connected ? 'missing Settings read grant' : 'docker compose -f docker/compose.yml up -d')}
          />
        {:else}
          <PageHeader eyebrow="Settings" title={activePane.label} subtitle={activePane.blurb}>
          {#snippet actions()}
            <Button
              type="button"
              onclick={refresh}
              disabled={loading || !connected}
              class="font-mono" size="sm"
            >
              <DSIcon icon={RefreshCw} color="current" class={loading ? ' animate-spin' : ''} />
              refresh
            </Button>
          {/snippet}
          </PageHeader>

          {#if unreachable}
          <EmptyState
            illustration={connectionLost}
            illustrationSize="sm"
            title={connected ? `Unable to read ${activePane.label.toLowerCase()}` : 'No active connection'}
            message={connected
              ? `The ${activePane.label} pane is intentionally empty because ${activePane.id === 'secrets' ? 'SHOW SECRETS' : 'SHOW CONFIG'} did not complete.`
              : 'Start or select a reddb target, then return here to inspect live config.'}
            hint={connected ? loadError ?? activeUrl : 'docker compose -f docker/compose.yml up -d'}
          />
          {:else if activePane.id === 'secrets'}
            <section class="grid gap-4">
              {#if !selectedSecret || !selectedSecretControl}
                <EmptyState
                  icon={KeyRound}
                  title="No secret selected"
                  message="Select a live SHOW SECRETS row to inspect its masked metadata."
                />
              {:else}
                <section>
                  <SectionHeading size="sm" rule={false} title={selectedSecretControl.label} class="mb-2">
                    {#snippet leading()}<DsIcon icon={KeyRound} size="sm" />{/snippet}
                    {#snippet actions()}<Pill>masked</Pill>{/snippet}
                  </SectionHeading>

                  <div class="divide-y divide-line-1 overflow-hidden rounded-lg border border-muted bg-elevation-base-surface">
                    <SettingsRow
                      label={selectedSecretControl.label}
                      description="Vault metadata row; plaintext is masked unless break-glass reveal is granted."
                      hint={selectedSecret.key}
                      wide
                    >
                      {#snippet actions()}
                        <Input
                          readonly
                          value={selectedSecretPlaintext ?? selectedSecret.value}
                          aria-label={selectedSecretControl.label}
                          class="font-mono w-full" controlSize="sm"
                        />
                      {/snippet}
                    </SettingsRow>

                    <SettingsRow label="Key" hint={selectedSecret.key}>
                      {#snippet actions()}
                        <span class="font-mono text-[12px] text-foreground">{selectedSecret.key}</span>
                      {/snippet}
                    </SettingsRow>

                    <SettingsRow label="Metadata">
                      {#snippet actions()}
                        <div class="flex flex-wrap justify-end gap-1.5">
                          <Pill>{selectedSecret.status ?? 'status unknown'}</Pill>
                          <Pill
                            >version {selectedSecret.version === undefined
                              ? 'unknown'
                              : selectedSecret.version}</Pill
                          >
                        </div>
                      {/snippet}
                    </SettingsRow>

                    {#if canRevealSecrets}
                      <SettingsRow label="Break-glass reveal" description="Calls reddb's audited UNSEAL VAULT path and clears plaintext after 30 seconds.">
                        {#snippet actions()}
                          {#if selectedSecretPlaintext !== null}
                            <Button
                              type="button"
                              onclick={clearRevealedSecret}
                              class="font-mono" size="sm"
                            >
                              <DSIcon icon={EyeOff} color="current" class="" />
                              hide
                            </Button>
                          {:else}
                            <Button
                              type="button"
                              onclick={revealSelectedSecret}
                              disabled={revealing}
                              class="font-mono" size="sm" tone="warning"
                            >
                              <DSIcon icon={Eye} color="current" class={revealing ? ' animate-pulse' : ''} />
                              reveal
                            </Button>
                          {/if}
                        {/snippet}
                      </SettingsRow>
                    {/if}

                    {#if canWriteSecrets}
                      <SettingsRow label="Authoring" description="Delete the selected vault secret through DELETE SECRET.">
                        {#snippet actions()}
                          <Button
                            type="button"
                            onclick={() => deleteSelectedSecret()}
                            disabled={writing}
                            class="font-mono" size="sm" tone="danger"
                          >
                            <DSIcon icon={Trash2} color="current" class="" />
                            delete
                          </Button>
                        {/snippet}
                      </SettingsRow>
                    {/if}
                  </div>
                </section>
              {/if}

              {#if revealStatus && revealStatus.key === selectedSecret?.key}
                <div
                  class={[
                    'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px]',
                    revealStatus.tone === 'ok'
                      ? 'border-ok/30 bg-feedback-success-fill/5 text-feedback-success-foreground'
                      : 'border-feedback-danger-border/30 bg-feedback-danger-fill/5 text-feedback-danger-foreground',
                  ].join(' ')}
                  role="status"
                >
                  <DSIcon icon={AlertCircle} color="current" class=" shrink-0" />
                  <span class="truncate">{revealStatus.message}</span>
                </div>
              {/if}

              {#if canWriteSecrets}
                {#if writeStatus?.paneId === 'secrets'}
                  <div
                    class={[
                      'inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px]',
                      writeStatus.tone === 'ok'
                        ? 'border-ok/30 bg-feedback-success-fill/5 text-feedback-success-foreground'
                        : 'border-feedback-danger-border/30 bg-feedback-danger-fill/5 text-feedback-danger-foreground',
                    ].join(' ')}
                    role="status"
                  >
                    <DSIcon icon={AlertCircle} color="current" class=" shrink-0" />
                    <span class="truncate">{writeStatus.message}</span>
                  </div>
                {/if}

                <section>
                  <SectionHeading size="sm" rule={false} title="Set secret" class="mb-2">
                    {#snippet leading()}<DsIcon icon={Plus} size="sm" />{/snippet}
                  </SectionHeading>
                  <div class="grid gap-2 rounded-lg border border-muted bg-elevation-base-surface p-3">
                    <Input
                      type="text"
                      value={secretWriteKey}
                      oninput={(e) => (secretWriteKey = e.currentTarget.value)}
                      placeholder="mycompany.payments.key"
                      disabled={writing}
                      aria-label="Secret key"
                      class="font-mono" controlSize="sm"
                    />
                    <Input
                      type="password"
                      value={secretWriteValue}
                      oninput={(e) => (secretWriteValue = e.currentTarget.value)}
                      placeholder="New secret value"
                      disabled={writing}
                      autocomplete="new-password"
                      aria-label="New secret value"
                      class="font-mono" controlSize="sm"
                    />
                    <div class="flex justify-end">
                      <Button
                        type="button"
                        onclick={setSecretValue}
                        disabled={writing || !secretWriteKey.trim() || !secretWriteValue}
                        class="font-mono shrink-0" size="sm"
                      >
                        <DSIcon icon={Save} color="current" class="" />
                        set
                      </Button>
                    </div>
                  </div>
                </section>
              {/if}
            </section>
          {:else if !selectedEntry || !selectedControl}
          <EmptyState
            illustration={collectionEmpty}
            title="No config entry selected"
            message="Select a live SHOW CONFIG row to inspect its read-only control."
          />
          {:else}
          <section>
            <SectionHeading size="sm" rule={false} title={selectedControl.label} class="mb-2">
              {#snippet leading()}
                {#if selectedControl.kind === 'secret-reference'}
                  <DsIcon icon={Link2} size="sm" />
                {:else}
                  <DsIcon icon={SlidersHorizontal} size="sm" />
                {/if}
              {/snippet}
              {#snippet actions()}<Pill>{selectedControl.kind}</Pill>{/snippet}
            </SectionHeading>

            <div class="divide-y divide-line-1 overflow-hidden rounded-lg border border-muted bg-elevation-base-surface">
              <SettingsRow
                label={selectedControl.label}
                description={selectedControl.description}
                hint={selectedEntry.key}
                wide
              >
                {#snippet actions()}
                  {#if selectedControl.kind === 'boolean'}
                    <Checkbox label={canWriteConfig ? editValue : selectedEntry.value ? 'true' : 'false'} aria-label={`${selectedControl.label}: ${canWriteConfig ? editValue : selectedEntry.value ? 'true' : 'false'}`} checked={canWriteConfig ? editValue === 'true' : selectedEntry.value === true} disabled={!canWriteConfig || writing} oncheckedchange={checked => editValue = checked ? 'true' : 'false'} />
                  {:else if selectedControl.kind === 'enum'}
                    <Select
                      disabled={!canWriteConfig || writing}
                      value={canWriteConfig ? editValue : String(selectedEntry.value)}
                      onchange={(e) => (editValue = e.currentTarget.value)}
                      class="font-mono min-w-[12rem]" controlSize="sm" aria-label={selectedControl.label}
                    >
                      {#if !selectedControl.options?.includes(String(selectedEntry.value))}
                        <option value={String(selectedEntry.value)}>{formatValue(selectedEntry)}</option>
                      {/if}
                      {#each selectedControl.options ?? [] as option}
                        <option value={option}>{option}</option>
                      {/each}
                    </Select>
                  {:else if selectedControl.kind === 'list'}
                    <Textarea
                      readonly={!canWriteConfig}
                      disabled={writing}
                      rows={5}
                      value={canWriteConfig ? editValue : formatLongValue(selectedEntry.value)}
                      oninput={(e) => (editValue = e.currentTarget.value)}
                      class="font-mono w-full min-h-24 resize-y" aria-label={selectedControl.label}
                    ></Textarea>
                  {:else if selectedControl.kind === 'secret-reference'}
                    <Input
                      readonly
                      type="text"
                      value={formatValue(selectedEntry)}
                      class="font-mono w-full" controlSize="sm" aria-label={selectedControl.label}
                    />
                  {:else}
                    <Input
                      readonly={!canWriteConfig}
                      disabled={writing}
                      type={selectedControl.kind === 'number' ? 'text' : 'text'}
                      value={canWriteConfig ? editValue : formatValue(selectedEntry)}
                      oninput={(e) => (editValue = e.currentTarget.value)}
                      class="font-mono w-full" controlSize="sm" aria-label={selectedControl.label}
                    />
                  {/if}
                {/snippet}
              </SettingsRow>

              <SettingsRow label="Key" hint={selectedEntry.key}>
                {#snippet actions()}
                  <span class="font-mono text-[12px] text-foreground">{selectedEntry.key}</span>
                {/snippet}
              </SettingsRow>

              <SettingsRow label="Schema">
                {#snippet actions()}
                  <div class="flex flex-wrap justify-end gap-1.5">
                    <Pill>{selectedControl.valueType ?? 'runtime type'}</Pill>
                    <Pill
                      >schema {selectedControl.schemaVersion === undefined
                        ? 'unknown'
                        : selectedControl.schemaVersion}</Pill
                    >
                  </div>
                {/snippet}
              </SettingsRow>

              {#if canWriteConfig}
                <SettingsRow label="Authoring" description="Submit changes through SET CONFIG or unset through DELETE CONFIG.">
                  {#snippet actions()}
                    <div class="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        onclick={saveSelectedConfig}
                        disabled={writing || selectedControl.kind === 'secret-reference'}
                        title={selectedControl.kind === 'secret-reference'
                          ? 'Secret references can be unset, but not edited as plaintext config.'
                          : 'Save config value'}
                        class="font-mono" size="sm"
                      >
                        <DSIcon icon={Save} color="current" class="" />
                        save
                      </Button>
                      <Button
                        type="button"
                        onclick={() => unsetSelectedConfig()}
                        disabled={writing}
                        class="font-mono" size="sm" tone="danger"
                      >
                        <DSIcon icon={Trash2} color="current" class="" />
                        unset
                      </Button>
                    </div>
                  {/snippet}
                </SettingsRow>
              {/if}
            </div>

            {#if canWriteConfig}
              {#if writeStatus?.paneId === 'config'}
                <div
                  class={[
                    'mt-3 inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px]',
                    writeStatus.tone === 'ok'
                      ? 'border-ok/30 bg-feedback-success-fill/5 text-feedback-success-foreground'
                      : 'border-feedback-danger-border/30 bg-feedback-danger-fill/5 text-feedback-danger-foreground',
                  ].join(' ')}
                  role="status"
                >
                  <DSIcon icon={AlertCircle} color="current" class=" shrink-0" />
                  <span class="truncate">{writeStatus.message}</span>
                </div>
              {/if}

              <section class="mt-4 border-t border-muted pt-4">
                <SectionHeading size="sm" rule={false} title="Set config key" class="mb-2">
                  {#snippet leading()}<DsIcon icon={Plus} size="sm" />{/snippet}
                </SectionHeading>
                <div class="grid gap-2 rounded-lg border border-muted bg-elevation-base-surface p-3">
                  <div class="grid gap-2 @min-[42rem]:grid-cols-[minmax(0,1fr)_8rem]">
                    <Input
                      type="text"
                      value={newConfigKey}
                      oninput={(e) => (newConfigKey = e.currentTarget.value)}
                      placeholder="red.example.key"
                      disabled={writing}
                      aria-label="New config key"
                      class="font-mono" controlSize="sm"
                    />
                    <Select
                      value={newConfigKind}
                      onchange={(e) => (newConfigKind = e.currentTarget.value as typeof newConfigKind)}
                      disabled={writing}
                      aria-label="New config value type"
                      class="font-mono" controlSize="sm"
                    >
                      <option value="text">text</option>
                      <option value="number">number</option>
                      <option value="boolean">boolean</option>
                      <option value="list">list</option>
                    </Select>
                  </div>

                  {#if newConfigKind === 'boolean'}
                    <Checkbox label="New config value" checked={newConfigValue === 'true'} disabled={writing} oncheckedchange={checked => newConfigValue = checked ? 'true' : 'false'} />
                  {:else if newConfigKind === 'list'}
                    <Textarea
                      rows={4}
                      value={newConfigValue}
                      oninput={(e) => (newConfigValue = e.currentTarget.value)}
                      placeholder='["main", "release"]'
                      disabled={writing}
                      aria-label="New config value"
                      class="font-mono min-h-20 resize-y"
                    ></Textarea>
                  {:else}
                    <Input
                      type="text"
                      value={newConfigValue}
                      oninput={(e) => (newConfigValue = e.currentTarget.value)}
                      placeholder={newConfigKind === 'number' ? '1000' : 'value'}
                      disabled={writing}
                      aria-label="New config value"
                      class="font-mono" controlSize="sm"
                    />
                  {/if}

                  <div class="flex justify-end">
                    <Button
                      type="button"
                      onclick={setNewConfig}
                      disabled={writing || !newConfigKey.trim()}
                      class="font-mono shrink-0" size="sm"
                    >
                      <DSIcon icon={Plus} color="current" class="" />
                      set
                    </Button>
                  </div>
                </div>
              </section>
            {/if}
          </section>
          {/if}
        {/if}
      </div>
    </div>
  </div>
</div>

<AlertDialog title={confirmation?.title ?? 'Confirm deletion'} description="This action cannot be undone."
  open={confirmation !== null} onopenchange={next => { if (!next) confirmation = null }}
  confirmLabel="Confirm" onconfirm={() => { const action = confirmation?.run; return Promise.resolve(action?.()) }} />
