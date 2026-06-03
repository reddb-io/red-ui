<script lang="ts">
  // The Mountable Root (ADR-0001). Owns the app chrome and switches between
  // its top-level views purely from an injected `Router` — it never reads or
  // writes the URL itself. Mounted standalone it falls back to an in-memory
  // state router, so a host can embed it without surrendering `window.history`.
  // The SvelteKit Surface wraps this same component with a Kit-backed router.
  import { onMount, untrack } from 'svelte'
  import Splash from './Splash.svelte'
  import Topbar from './Topbar.svelte'
  import StatusBar from './StatusBar.svelte'
  import CommandPalette from './CommandPalette.svelte'
  import ShortcutOverlay from './ShortcutOverlay.svelte'
  import MasterPasswordDialog from './MasterPasswordDialog.svelte'
  import PendingChangesPanel from './PendingChangesPanel.svelte'
  import CollectionsView from './CollectionsView.svelte'
  import ClusterView from './ClusterView.svelte'
  import SecurityView from './SecurityView.svelte'
  import SettingsView from './SettingsView.svelte'
  import Appearance from './Appearance.svelte'
  import { connection, setConnectionProvider } from './connections.svelte'
  import { runQueryPreferStream, type ConnectionProvider } from '#reddb'
  import { theme, type Theme } from './theme.svelte'
  import { skins } from './skins/skins.svelte'
  import { secureStore } from './secureStore.svelte'
  import { pendingChanges, buildUpdateSql, type CommitOutcome } from './pending-changes.svelte'
  import { queryTabs } from './query-tabs.svelte'
  import { tabs } from './tabs.svelte'
  import { detectCapability } from './capability'
  import { defaultSubpage } from './collection-pages'
  import { createStateRouter, pathToLocation, setRouter, type Router, type View } from './router.svelte'

  let {
    router: injectedRouter,
    connectionProvider,
    showConnect = true,
    initialRoute,
    themeTarget,
    persistTheme = true,
    initialTheme,
  }: {
    router?: Router
    connectionProvider?: ConnectionProvider
    showConnect?: boolean
    initialRoute?: string
    themeTarget?: HTMLElement | null
    persistTheme?: boolean
    initialTheme?: Theme
  } = $props()

  // Provide the router to every descendant view. Standalone (no host router)
  // we mint a state router that keeps navigation entirely in memory. The
  // router is fixed for the lifetime of the mount, so reading the prop once
  // here is intentional.
  // svelte-ignore state_referenced_locally
  const router = setRouter(injectedRouter ?? createStateRouter())

  // Host-injected connection (ADR-0001 embed Surface): when the embedder
  // hands in a provider (e.g. an InjectedClientProvider wrapping its own
  // authenticated client), wire it as the Core's connection seam and connect
  // immediately, so the Core renders connected without the Connect flow. The
  // provider is fixed for the lifetime of the mount.
  // svelte-ignore state_referenced_locally
  if (connectionProvider) {
    setConnectionProvider(connectionProvider)
  }

  function navigateToBootRoute(route: string) {
    const legacyView = route as View
    if (legacyView === 'query' || legacyView === 'collections' || legacyView === 'cluster' || legacyView === 'security' || legacyView === 'settings' || legacyView === 'appearance') {
      router.go({ view: legacyView }, undefined, true)
      return
    }

    const loc = pathToLocation(route.startsWith('/') ? route : `/${route}`)
    if (loc.collection) {
      router.go({ view: 'collection', collection: loc.collection, subpage: loc.subpage ?? 'table' }, undefined, true)
    } else {
      router.go({ view: loc.view }, undefined, true)
    }
  }

  onMount(() => {
    if (connectionProvider) {
      // Host-injected provider (#33): adopt its authenticated connection.
      void connection.adoptInjected().then(() => {
        if (initialRoute) navigateToBootRoute(initialRoute)
      })
    } else {
      // Connection Bootstrap: one boot resolver handles Tauri IPC, host globals,
      // the Open Contract URL/hash, and finally persisted standalone state.
      void connection.bootstrap().then((route) => {
        if (route) navigateToBootRoute(route)
      })
    }
  })

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
    queryTabs.setExecutor((sql) => runQueryPreferStream(client, sql))
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
  // svelte-ignore state_referenced_locally
  theme.init({ target: themeTarget ?? null, persist: persistTheme, initial: initialTheme })

  // Skin-as-data (#75): apply the persisted skin's seed-derived custom
  // properties over the active theme. Scoped to the same target the theme
  // uses, so an embedded host's shadow root is skinned, not the document.
  // svelte-ignore state_referenced_locally
  skins.init(themeTarget ?? null)

  // Hard lock gate: while the secure store is locked, no automatic network
  // traffic should fire — probing the configured URL would leak its existence
  // and shape. Additionally (#21, acceptance #4) no traffic fires until a real
  // target is resolved (URL/boot params, a stored pin, or an explicit connect),
  // so a credential-less Surface that boots straight to data never probes a
  // default it was never pointed at.
  $effect(() => {
    if (secureStore.locked || !connection.targetResolved) return
    connection.refresh()
    const id = setInterval(() => connection.refresh(), REFRESH_MS)
    return () => clearInterval(id)
  })

  // Once the secure store binds (Tauri at boot / web after unlock), hydrate
  // history URLs from the encrypted store so the dropdown can reconnect.
  $effect(() => {
    if (secureStore.store) connection.hydrateUrls()
  })

  function openNewQuery() {
    const label = queryTabs.nextLabel()
    const tab = tabs.open({ kind: 'query', label, key: label }, true)
    queryTabs.ensure(tab.id)
  }

  // Open (or focus) the tab for the collection the router points at, detecting
  // its capability lazily. When the router hasn't pinned a subpage yet (a bare
  // `/c/<name>` deep link), settle on the capability's default subpage — the
  // same redirect the old per-route page did, now router-agnostic.
  async function syncCollectionTab(name: string, subpage: string | null) {
    const existing = tabs.tabs.find((t) => t.kind === 'collection' && t.key === name)
    if (existing) {
      tabs.open({
        kind: 'collection',
        label: name,
        key: name,
        capability: existing.capability,
        overrideCapability: existing.overrideCapability,
        showSystemColumns: existing.showSystemColumns,
        subpage: subpage ?? existing.subpage,
      })
    } else {
      tabs.open({ kind: 'collection', label: name, key: name, capability: 'table', subpage: subpage ?? undefined })
    }

    const client = connection.client
    if (!client) {
      if (!subpage) router.go({ view: 'collection', collection: name, subpage: 'table' }, undefined, true)
      return
    }
    try {
      const cap = await detectCapability(client, name)
      const t = tabs.tabs.find((x) => x.kind === 'collection' && x.key === name)
      const resolved = subpage ?? defaultSubpage(cap)
      if (t) tabs.tabs = tabs.tabs.map((x) => (x === t ? { ...x, capability: cap, subpage: resolved } : x))
      if (!subpage) router.go({ view: 'collection', collection: name, subpage: resolved }, undefined, true)
    } catch {
      // Detection failure is non-fatal — table stays the baseline.
      if (!subpage) router.go({ view: 'collection', collection: name, subpage: 'table' }, undefined, true)
    }
  }

  // Bridge the router location to tab state. Works identically whether the
  // location comes from in-memory state or the SvelteKit URL.
  let lastView: View | null = null
  let lastCollectionKey: string | null = null
  $effect(() => {
    const view = router.view
    const collection = router.collection
    const subpage = router.subpage

    if (view === 'collections' && collection) {
      const key = `${collection}::${subpage ?? ''}`
      if (key !== lastCollectionKey) {
        lastCollectionKey = key
        untrack(() => void syncCollectionTab(collection, subpage))
      }
    } else {
      lastCollectionKey = null
    }

    // Entering the query view mints a fresh query tab, matching the old
    // `/query` route. Guarded on the transition so reactive ticks don't
    // spawn duplicate tabs.
    if (view === 'query' && lastView !== 'query') {
      untrack(() => openNewQuery())
    }
    lastView = view
  })
</script>

{#if !booted}
  <Splash onDone={() => (booted = true)} />
{:else}
  <div class="app grid grid-rows-[44px_32px_1fr] h-screen">
    <Topbar showConnect={showConnect} />
    <StatusBar />
    <main class="relative overflow-hidden z-[1]">
      {#if router.view === 'cluster'}
        <ClusterView />
      {:else if router.view === 'security'}
        <SecurityView />
      {:else if router.view === 'settings'}
        <SettingsView />
      {:else if router.view === 'appearance'}
        <Appearance />
      {:else}
        <CollectionsView />
      {/if}
    </main>
    <CommandPalette />
    <ShortcutOverlay />
    <MasterPasswordDialog />
    <PendingChangesPanel open={pendingOpen} onClose={() => (pendingOpen = false)} />
  </div>
{/if}
