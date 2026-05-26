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

  // The inline script in app.html has already set data-theme on <html>;
  // init() syncs the store's reactive state with localStorage so toggles
  // start from the persisted value rather than the in-memory default.
  theme.init()

  // Hard lock gate: while the secure store is locked, no automatic
  // network traffic should fire. The user hasn't yet authenticated this
  // session, so probing the configured URL would leak its existence and
  // shape to anyone watching the network panel.
  $effect(() => {
    if (secureStore.locked) return
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
