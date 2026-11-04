<script lang="ts">
  // The Mountable Root (ADR-0001). Owns the app chrome and switches between
  // its top-level views purely from an injected `Router` — it never reads or
  // writes the URL itself. Mounted standalone it falls back to an in-memory
  // state router, so a host can embed it without surrendering `window.history`.
  // The SvelteKit Surface wraps this same component with a Kit-backed router.
  import { onMount, onDestroy, tick, untrack } from 'svelte'
  import { BitsConfig } from 'bits-ui'
  import { createWorkspaceRuntime, type WorkspaceRuntime } from './workspace-runtime.svelte'
  import { setWorkspaceRuntime } from './workspace-context'
  import Splash from './Splash.svelte'
  import LoadingOverlay from './LoadingOverlay.svelte'
  import DevConsole from './DevConsole.svelte'
  import GlobalProgressBar from './GlobalProgressBar.svelte'
  import Topbar from './Topbar.svelte'
  import WorkspaceNavigation from './WorkspaceNavigation.svelte'
  import StatusBar from './StatusBar.svelte'
  import CommandPalette from './CommandPalette.svelte'
  import ShortcutOverlay from './ShortcutOverlay.svelte'
  import MasterPasswordDialog from './MasterPasswordDialog.svelte'
  import PendingChangesPanel from './PendingChangesPanel.svelte'
  import CollectionsView from './CollectionsView.svelte'
  import ClusterView from './ClusterView.svelte'
  import AskView from './AskView.svelte'
  import SecurityView from './SecurityView.svelte'
  import SettingsView from './SettingsView.svelte'
  import Appearance from './Appearance.svelte'
  import { runQueryPreferStream, type ConnectionProvider } from './reddb/index'
  import type { Theme } from './theme.svelte'
  import { buildUpdateSql, type CommitOutcome } from './pending-changes.svelte'
  import { detectCapability } from './capability'
  import { defaultSubpage } from './collection-pages'
  import { createStateRouter, pathToLocation, setRouter, type Router, type View } from './router.svelte'
  import type { WorkspacePersistence } from './workspace-persistence'
  import type { WorkspaceSnapshot } from './workspace-session'

  let {
    router: injectedRouter,
    runtime: suppliedRuntime,
    label,
    persistenceKey,
    persistence,
    portalTarget: injectedPortalTarget,
    connectionProvider,
    showConnect = true,
    initialRoute,
    themeTarget,
    persistTheme = true,
    initialTheme,
  }: {
    router?: Router
    runtime?: WorkspaceRuntime
    label?: string
    persistenceKey?: string
    persistence?: WorkspacePersistence
    portalTarget?: HTMLElement
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

  // The runtime and router are fixed for this mount. Ownership transfers to
  // the Workspace; disposal never changes another mount or its host provider.
  // svelte-ignore state_referenced_locally
  const workspace = setWorkspaceRuntime(suppliedRuntime ?? createWorkspaceRuntime({ connectionProvider, persistenceKey, persistence }))
  const { connection, theme, skins, secureStore, pendingChanges, queryTabs, tabs, workspaceSession, loading, devConsole } = workspace
  let portalTarget = $state<HTMLDivElement>()

  $effect(() => { workspace.portalTarget = injectedPortalTarget ?? portalTarget ?? null })

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

  function buildSnapshot(): WorkspaceSnapshot {
    return {
      view: router.view,
      collection: router.collection,
      subpage: router.subpage,
      tabs: tabs.tabs,
      activeTabId: tabs.activeId,
      queries: queryTabs.snapshot(tabs.tabs),
    }
  }

  function applySnapshot(snap: WorkspaceSnapshot): void {
    queryTabs.restore(snap.queries, snap.tabs)
    tabs.hydrate(snap.tabs, snap.activeTabId)
    // A direct URL remains authoritative; a bare launch restores the last view.
    if (workspace.persistenceKey === 'default' && router.path !== '/') return
    router.go(
      snap.collection
        ? { view: 'collection', collection: snap.collection, subpage: snap.subpage ?? 'table' }
        : { view: snap.view },
      undefined,
      true,
    )
  }

  let restored = $state(false)
  onMount(() => {
    // Restore documents before any route effect can mint an empty query tab.
    void workspace.ready.then(() => {
    if (workspace.session.disposed) return
    const snap = workspaceSession.restore()
    if (snap) {
      applySnapshot(snap)
      // A reload of the same route must retain the selected result document,
      // even when that document is a query in the collections workspace.
      if (snap.tabs.some(tab => tab.id === snap.activeTabId) && router.view === snap.view && router.collection === snap.collection && router.subpage === snap.subpage) {
        lastView = router.view
        lastCollectionKey = router.collection ? `${router.collection}::${router.subpage ?? ''}` : null
      }
    }
    restored = true
    })
    if (workspace.injected) {
      // Host-injected provider (#33): adopt its authenticated connection.
      void connection.adoptInjected().then(() => {
        if (workspace.session.disposed) return
        if (initialRoute) navigateToBootRoute(initialRoute)
      })
    } else {
      // Connection Bootstrap: one boot resolver handles Tauri IPC, host globals,
      // the Open Contract URL/hash, and finally persisted standalone state.
      void connection.bootstrap().then((route) => {
        if (workspace.session.disposed) return
        if (route) {
          navigateToBootRoute(route)
        }
      })
    }
  })

  let booted = $state(false)
  let pendingOpen = $state(false)
  let shell = $state<HTMLDivElement>()

  onDestroy(() => {
    if (booted && restored) workspaceSession.flush(buildSnapshot())
    workspace.dispose()
  })

  async function closePending() {
    pendingOpen = false
    await tick()
    // Native dialog close/focus restoration finishes after the reactive flush.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    if (!shell?.isConnected) return
    const active = (shell.getRootNode() as Document | ShadowRoot).activeElement
    const closedDialog = active?.closest('dialog')
    const lostModalFocus = closedDialog instanceof HTMLDialogElement && !closedDialog.open
    if (active?.isConnected && active !== shell.ownerDocument.body && !lostModalFocus) return
    // Applying/discarding the final change removes its invoking status button.
    // Keep keyboard navigation at the active document (or current destination).
    const next = shell.querySelector<HTMLElement>('[data-workspace-tab][aria-selected="true"]')
      ?? shell.querySelector<HTMLElement>('a[aria-current="page"]')
      ?? shell.querySelector<HTMLElement>('button[aria-haspopup="dialog"]')
    next?.focus()
  }

  onMount(() => {
    const handler = () => (pendingOpen = true)
    const stops = ['red:open-pending-changes', 'red:apply-pending', 'red:discard-pending'].map(command =>
      workspace.on(command as 'red:open-pending-changes' | 'red:apply-pending' | 'red:discard-pending', handler))
    return () => stops.forEach(stop => stop())
  })

  // Runtime deep-link routing: subscribe to Tauri "deep-link" events so that
  // clicking a red:// URL while the app is already running focuses the window
  // (handled Rust-side via single-instance) and routes to the target connection.
  // Boot-time deep links go through connection.bootstrap(); this path handles
  // everything that arrives after the app is already mounted.
  onMount(() => {
    if (typeof window === 'undefined' || workspace.injected || workspace.persistenceKey !== 'default') return
    if (!('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) return

    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<string[]>('deep-link', async (event) => {
          const raw = event.payload?.[0]
          if (!raw) return

          // Extract ?to= route before normalizing the connection target.
          let target = raw
          let route: string | null = null
          try {
            const equiv = raw.replace(/^reds?(\+[a-z]+)?:\/\//, 'http://')
            const u = new URL(equiv)
            route = u.searchParams.get('to')
            if (route) target = raw.split('?')[0]
          } catch {}

          await connection.connectString(target)
          if (route) navigateToBootRoute(route)
        })
      )
      .then((fn) => { if (workspace.session.disposed) fn(); else unlisten = fn })

    return () => { unlisten?.() }
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
    queryTabs.setExecutor((sql, options) =>
      runQueryPreferStream(client, sql, options)
    )
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

  onMount(() => {
    void workspace.ready.then(() => {
    if (workspace.session.disposed) return
    const target = themeTarget ?? workspace.root
    theme.init({ target, persist: Boolean(workspace.persistenceKey) && persistTheme, initial: initialTheme })
    skins.init(target)
    })
  })

  // Hard lock gate: while the secure store is locked, no automatic network
  // traffic should fire — probing the configured URL would leak its existence
  // and shape. Additionally (#21, acceptance #4) no traffic fires until a real
  // target is resolved (URL/boot params, a stored pin, or an explicit connect),
  // so a credential-less Surface that boots straight to data never probes a
  // default it was never pointed at.
  $effect(() => {
    if (secureStore.requiresUnlock || !connection.targetResolved) return
    // Poll only an acquired client. Re-entering connect here races with the
    // boot/login token exchange; tracking refresh reads also retriggers this
    // effect whenever a probe changes instead of waiting for the interval.
    const refresh = () => { if (connection.client) void connection.refresh() }
    untrack(refresh)
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  })

  // Once the secure store binds (Tauri at boot / web after unlock), hydrate
  // history URLs from the encrypted store so the dropdown can reconnect.
  $effect(() => {
    if (secureStore.store) connection.hydrateUrls()
  })

  // Opening an installed app offline keeps its documents and known session.
  // Reacquire only the connection on network recovery, never replay its queries.
  onMount(() => {
    const reconnect = () => {
      if (secureStore.surface === 'web' && !workspace.injected && !connection.client && connection.targetResolved) void connection.bootstrap()
    }
    window.addEventListener('online', reconnect)
    return () => window.removeEventListener('online', reconnect)
  })

  // Autosave: debounce-schedule a snapshot on every router/tab state change.
  // Guard on `booted` so we don't snapshot the blank pre-splash state.
  $effect(() => {
    if (!booted || !restored) return
    const snap = buildSnapshot()
    workspaceSession.schedule(snap)
  })

  // Flush immediately on page hide / window blur so an edit made
  // right before closing is never lost to the debounce window.
  onMount(() => {
    const flush = () => { if (booted && restored) workspaceSession.flush(buildSnapshot()) }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('blur', flush)
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('blur', flush)
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  })

  // Tauri close-request: flush, then destroy the window. The Rust watchdog
  // races this — if the webview hangs, it force-destroys after its bound.
  onMount(() => {
    if (typeof window === 'undefined' || workspace.injected || workspace.persistenceKey !== 'default') return
    if (!('__TAURI_INTERNALS__' in window || '__TAURI__' in window)) return

    let unlisten: (() => void) | undefined

    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<void>('close-request', async () => {
          if (restored) workspaceSession.flush(buildSnapshot())
          try { await workspace.flushPersistence() } catch { /* The metadata recovery journal is retained. */ }
          const { getCurrentWindow } = await import('@tauri-apps/api/window')
          await getCurrentWindow().destroy()
        }),
      )
      .then((fn) => { if (workspace.session.disposed) fn(); else unlisten = fn })

    return () => { unlisten?.() }
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
    if (!restored) return
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

    // Navigation returns to existing query documents. Only the explicit new
    // query command mints another tab; hydration must never create duplicates.
    if (view === 'query' && lastView !== 'query') {
      untrack(() => {
        const existing = tabs.tabs.find(tab => tab.kind === 'query')
        if (!existing) openNewQuery()
        else if (tabs.active?.kind !== 'query') tabs.focus(existing.id)
      })
    }
    lastView = view
  })
</script>

<svelte:element this={workspace.persistenceKey === 'default' ? 'div' : 'section'}
  bind:this={workspace.root} data-workspace-root={workspace.id}
  aria-label={workspace.persistenceKey === 'default' ? undefined : (label ?? `${connection.active.label} workspace`)}
  class={`relative isolate h-full bg-background text-foreground ${workspace.persistenceKey === 'default' ? 'min-h-screen' : 'min-h-[720px]'}`} tabindex="-1">
<BitsConfig defaultPortalTo={injectedPortalTarget ?? portalTarget}>
{#if !booted}
  <Splash contained onDone={() => (booted = true)} />
{:else}
  <div bind:this={shell} class="app relative grid min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto_minmax(0,1fr)] h-screen">
    <GlobalProgressBar />
    <Topbar showConnect={showConnect} />
    <StatusBar />
    <div data-workspace-body class="flex min-h-0 min-w-0 overflow-hidden">
    <WorkspaceNavigation label={label ?? connection.active.label} />
    <svelte:element this={workspace.persistenceKey === 'default' ? 'main' : 'div'} class="relative min-h-0 min-w-0 flex-1 overflow-hidden z-[1]">
      {#if !restored}
        <div role="status" class="flex h-full items-center justify-center text-sm text-ink-muted">Opening saved workspace…</div>
      {:else if router.view === 'ask'}
        <AskView />
      {:else if router.view === 'cluster'}
        <ClusterView />
      {:else if router.view === 'security'}
        <SecurityView />
      {:else if router.view === 'analytics'}
        <!-- Lazy: LayerChart + d3 are heavy, so the charting bundle only
             loads when the user actually opens Analytics. -->
        {#await import('./AnalyticsView.svelte')}
          <div class="flex h-full items-center justify-center font-mono text-[12px] text-ink-muted">loading analytics…</div>
        {:then { default: AnalyticsView }}
          <AnalyticsView />
        {/await}
      {:else if router.view === 'settings'}
        <SettingsView />
      {:else if router.view === 'appearance'}
        <Appearance />
      {:else}
        <CollectionsView />
      {/if}
    </svelte:element>
    </div>
    <CommandPalette />
    <ShortcutOverlay />
    <MasterPasswordDialog />
    <PendingChangesPanel open={pendingOpen} onClose={closePending} />
  </div>
{/if}

<!-- Step-logged loading overlay (#127): sits above the shell during a slow
     connect/boot; self-hides once the open resolves and never flashes on fast
     opens. -->
<LoadingOverlay contained store={loading} />

<!-- Instrumented developer console (#128): a collapsible, accent-free log of
     every query/HTTP call the client made, toggled from the StatusBar. -->
<DevConsole contained store={devConsole} />

<div bind:this={portalTarget} data-workspace-portals={workspace.id}></div>
</BitsConfig>
</svelte:element>
