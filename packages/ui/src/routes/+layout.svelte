<script lang="ts">
  import '../app.css'
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { base } from '$app/paths'
  import { parseOpenContract } from '@red-ui/protocol'
  import Splash from '$lib/Splash.svelte'
  import Topbar from '$lib/Topbar.svelte'
  import StatusBar from '$lib/StatusBar.svelte'
  import CommandPalette from '$lib/CommandPalette.svelte'
  import ShortcutOverlay from '$lib/ShortcutOverlay.svelte'
  import MasterPasswordDialog from '$lib/MasterPasswordDialog.svelte'
  import PendingChangesPanel from '$lib/PendingChangesPanel.svelte'
  import { connection, makeCustomConnection } from '$lib/connections.svelte'
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

  // Open Contract bootstrap (issue #20): when this bundle is opened with a
  // target in the URL (`?cs=…`, optional `#token=…`, optional `?to=…`), boot
  // straight against it instead of waiting for the user to pick a connection
  // in the topbar. This is the URL source the broader Connection Bootstrap
  // (#19) will later fold into its priority ladder.
  onMount(() => {
    const { contract } = parseOpenContract(window.location)
    if (!contract.cs && !contract.to) return

    // The token travels only in the #hash and is consume-on-read: strip it
    // from the address bar so it never lingers in history and is never
    // written to persistent storage. (No handoff consumer exists yet in this
    // slice; reading + discarding satisfies the never-persist invariant.)
    if (contract.token) {
      const url = new URL(window.location.href)
      url.hash = ''
      history.replaceState(history.state, '', url.toString())
    }

    if (contract.cs) {
      // Bypass the Connect screen by connecting directly to the target.
      connection.tryConnect(makeCustomConnection(contract.cs))
    }
    if (contract.to) {
      goto(`${base}${contract.to}`, { replaceState: true })
    }
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
