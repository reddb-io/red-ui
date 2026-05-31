<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import StatusBar from '$lib/StatusBar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import ShortcutOverlay from '$lib/ShortcutOverlay.svelte'
  import MasterPasswordDialog from '$lib/MasterPasswordDialog.svelte'
  import PendingChangesPanel from '$lib/PendingChangesPanel.svelte'
  import { connection } from '$lib/connections.svelte'
  import { theme } from '$lib/theme.svelte'
  import { secureStore } from '$lib/secureStore.svelte'
  import { detectSurface, surfaceGatesBoot } from '$lib/surface'
  import { pendingChanges, buildUpdateSql, type CommitOutcome } from '$lib/pending-changes.svelte'
  import { queryTabs } from '$lib/query-tabs.svelte'

  let { children } = $props()
  let booted = $state(false)
  let pendingOpen = $state(false)

  onMount(() => {
    const handler = () => (pendingOpen = true)
    window.addEventListener('red:open-pending-changes', handler as EventListener)
    return () => window.removeEventListener('red:open-pending-changes', handler as EventListener)
  })

  // Wire the commit executor to the active client. Re-binds whenever the
  // underlying client changes (connect / disconnect / switch).
  $effect(() => {
    const client = connection.client
    if (!client) {
      pendingChanges.setExecutor(null)
      queryTabs.setExecutor(null)
      return
    }
    queryTabs.setExecutor((sql) => client.query(sql))
    pendingChanges.setExecutor(async (changes) =>
      Promise.all(
        changes.map(async (c): Promise<CommitOutcome> => {
          try {
            const r = await client.query(buildUpdateSql(c))
            if (!r.ok) return { id: c.id, ok: false, error: r.error ?? 'query failed' }
            return { id: c.id, ok: true }
          } catch (e) {
            return { id: c.id, ok: false, error: (e as Error).message }
          }
        }),
      ),
    )
  })

  const REFRESH_MS = 5000

  // Which Surface are we? The boot gate is Surface-aware: a credential-less
  // Surface (Embeddable Lib, or hosted web with nothing saved yet) must not
  // be blocked by the master-password vault. The Standalone (Desktop) Surface
  // keeps its keychain-backed vault. See $lib/surface + ADR 0001.
  const surface = detectSurface()

  // The vault gates boot only when this Surface owns a secret to protect
  // (web with existing envelopes, or standalone always) *and* it is still
  // locked. On web, `needsSetup` is true exactly when no envelope exists yet,
  // so `!needsSetup` means "a secret already exists".
  const bootGated = $derived(
    surfaceGatesBoot(surface, !secureStore.needsSetup) && secureStore.locked,
  )

  // The inline script in app.html has already set data-theme on <html>;
  // init() syncs the store's reactive state with localStorage so toggles
  // start from the persisted value rather than the in-memory default.
  theme.init()

  // Boot gate: hold all automatic network traffic until (a) the vault gate
  // is satisfied for this Surface and (b) a target has actually been resolved
  // — from the URL, the persisted last-used connection, or a user action.
  // Probing a default preset nobody chose would both leak its shape to the
  // network panel and violate "no traffic before a target is resolved".
  $effect(() => {
    if (bootGated) return
    if (!connection.targetResolved) return
    connection.refresh()
    const id = setInterval(() => connection.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  })

  // Once the secure store binds (Tauri at boot / web after unlock), hydrate
  // history URLs from the encrypted store so the dropdown can reconnect.
  $effect(() => {
    if (secureStore.store) connection.hydrateUrls()
  })
</script>

{#if !booted}
  <Splash onDone={() => (booted = true)} />
{:else}
  <div class="app grid grid-rows-[44px_32px_1fr] h-screen">
    <Topbar />
    <StatusBar />
    <main class="relative overflow-hidden z-[1]">
      {@render children?.()}
    </main>
    <CommandPalette />
    <ShortcutOverlay />
    <MasterPasswordDialog />
    <PendingChangesPanel open={pendingOpen} onClose={() => (pendingOpen = false)} />
  </div>
{/if}
