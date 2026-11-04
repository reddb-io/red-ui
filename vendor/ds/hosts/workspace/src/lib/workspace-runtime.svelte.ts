import {
  createWorkspaceSession,
  type WorkspaceSession as Session,
} from "@reddb-io/design-system/app/workspace";
import { ActivityStore, activity as legacyActivity } from "./activity.svelte";
import { LoadingStore, loading as legacyLoading } from "./loading.svelte";
import { TabsStore, tabs as legacyTabs } from "./tabs.svelte";
import {
  QueryTabsStore,
  queryTabs as legacyQueries,
} from "./query-tabs.svelte";
import {
  PendingChangesStore,
  pendingChanges as legacyChanges,
} from "./pending-changes.svelte";
import {
  SecureStoreSvc,
  secureStore as legacySecureStore,
} from "./secureStore.svelte";
import { ThemeStore, theme as legacyTheme } from "./theme.svelte";
import { SkinStore, skins as legacySkins } from "./skins/skins.svelte";
import {
  WorkspaceSession,
  acceptsSnapshot,
  workspaceSession as legacyPersistence,
} from "./workspace-session";
import {
  createConnections,
  connection,
  provider,
  getConnectionProvider,
  openDatabaseFile,
  unreachableConnectHint,
} from "./connections.svelte";
import {
  DevConsoleStore,
  devConsole as legacyConsole,
  type ConsoleSink,
  type ConnectionProvider,
} from "./reddb/index";
import {
  createRendererRegistry,
  registry as legacyRegistry,
  type RendererRegistry,
} from "./renderers";
import { MemoryStorage, scopedStorage } from "./workspace-storage";
import { detectSurface, type Surface } from "./surface";
import { WorkspaceMetadataStorage, type WorkspacePersistence, type PersistenceState } from "./workspace-persistence";
import { LocalConnections } from "./local-connections.svelte";
import { readUrlOpenContractBootstrap } from "./reddb/connection-bootstrap";
import type { KeyValueStorage } from "./connection-history";

export type WorkspaceCommand =
  | "red:open-connect"
  | "red:open-palette"
  | "red:open-shortcuts"
  | "red:new-query"
  | "red:open-pending-changes"
  | "red:apply-pending"
  | "red:discard-pending"
  | "red:toggle-dev-console";

export interface WorkspaceServices {
  connection: ReturnType<typeof createConnections>["connection"];
  activity: ActivityStore;
  loading: LoadingStore;
  tabs: TabsStore;
  queryTabs: QueryTabsStore;
  pendingChanges: PendingChangesStore;
  secureStore: SecureStoreSvc;
  theme: ThemeStore;
  skins: SkinStore;
  workspaceSession: WorkspaceSession;
  devConsole: DevConsoleStore;
  registry: RendererRegistry;
}

export interface WorkspaceRuntime extends WorkspaceServices {
  /** Metadata recovery completes independently of Vault unlock and connection login. */
  readonly ready: Promise<void>;
  /** Acknowledge pending local metadata commits before closing the host. */
  flushPersistence(): Promise<void>;
  /** Reports actual local durability; optimistic edits are never labeled saved. */
  readonly persistenceStatus: { state: PersistenceState; error: string | null };
  /** Explicitly saved device-local connection profiles and credential references. */
  readonly localConnections?: LocalConnections;
  readonly id: string;
  readonly injected: boolean;
  readonly persistenceKey?: string;
  readonly session: Session<WorkspaceServices, WorkspaceCommand>;
  root: HTMLElement | null;
  portalTarget: HTMLElement | null;
  on(command: WorkspaceCommand, listener: () => void): () => void;
  dispatch(command: WorkspaceCommand): void;
  ownsKeyboard(event: KeyboardEvent): boolean;
  idFor(name: string): string;
  openDatabaseFile: typeof openDatabaseFile;
  unreachableConnectHint: typeof unreachableConnectHint;
  dispose(): void;
}

export interface WorkspaceRuntimeOptions {
  /** The host retains ownership of authentication and its provider. */
  connectionProvider?: ConnectionProvider;
  /** Owned async backend, disposed with the runtime. Embedded mounts omit it by default. */
  persistence?: WorkspacePersistence;
  /** Omit for private memory. "default" preserves the standalone PWA's keys. */
  persistenceKey?: string;
  /** Explicit surface ownership, independent of other mounts in this page. */
  surface?: Surface;
  /** Host-owned telemetry tap, limited to this workspace's HTTP lifecycle. */
  consoleSink?: ConsoleSink;
  /** Optional persistence backend. Keys are projected to this workspace only. */
  storage?: KeyValueStorage;
  /** Tab-lifetime recovery backend; defaults to sessionStorage for persisted mounts. */
  resumeStorage?: KeyValueStorage;
}

/** Construct fresh instance services without starting a connection or timer. */
export function createWorkspaceRuntime(
  options: WorkspaceRuntimeOptions = {}
): WorkspaceRuntime {
  // Capture and sanitize credential URLs before any asynchronous engine work.
  const launch = options.persistenceKey === "default" && !options.connectionProvider
    ? readUrlOpenContractBootstrap() : null;
  const surface = options.surface ?? (options.connectionProvider ? "embedded" : detectSurface());
  const persistenceStatus = $state<{ state: PersistenceState; error: string | null }>({ state: "legacy", error: null });
  const id = `workspace-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
  const legacy = options.persistenceKey === "default";
  const prefix = `red-ui:workspace:${encodeURIComponent(options.persistenceKey ?? id)}:`;
  const journalKey = `red-ui:journal:${encodeURIComponent(options.persistenceKey ?? id)}:v1`;
  const keys = legacy
    ? {
        connection: "red-ui:connection",
        resume: "red-ui:connection-session",
        history: "red-ui:history",
        secure: "red-ui:secure",
        session: "red-ui-workspace-session",
        theme: "red-ui-theme",
        skin: "red-ui-skin",
      }
    : {
        connection: `${prefix}connection`,
        resume: `${prefix}connection-session`,
        history: `${prefix}history`,
        secure: `${prefix}secure`,
        session: `${prefix}session`,
        theme: `${prefix}theme`,
        skin: `${prefix}skin`,
      };
  let storage: KeyValueStorage = new MemoryStorage();
  if (options.persistenceKey) {
    try {
      const backing =
        options.storage ??
        (typeof localStorage !== "undefined" ? localStorage : undefined);
      if (backing)
        storage = scopedStorage(backing, (key) =>
          key === journalKey || (legacy
            ? Object.values(keys).includes(key) ||
              key.startsWith(`${keys.secure}:`)
            : key.startsWith(prefix))
        );
    } catch {
      /* Restricted storage keeps this mount in memory. */
    }
  }
  let resumeStorage: KeyValueStorage = new MemoryStorage();
  if (options.persistenceKey) {
    try {
      const backing =
        options.resumeStorage ??
        (typeof sessionStorage !== "undefined" ? sessionStorage : undefined);
      if (backing)
        resumeStorage = scopedStorage(backing, (key) =>
          key === journalKey || (legacy ? Object.values(keys).includes(key) : key.startsWith(prefix))
        );
    } catch {
      /* Restricted tabs keep recovery in memory. */
    }
  }
  const legacyStorage = storage;
  const persistence = options.persistence;
  const metadataKeys = new Set([keys.session, keys.theme, keys.skin, keys.history, keys.connection]);
  const metadata = persistence ? new WorkspaceMetadataStorage({
    persistence,
    profile: options.persistenceKey ?? id,
    legacy: legacyStorage,
    journal: options.resumeStorage ?? (surface === "standalone"
      ? legacyStorage
      : typeof sessionStorage !== "undefined" ? sessionStorage : new MemoryStorage()),
    owns: key => metadataKeys.has(key),
    accepts(key, value) {
      if (!metadataKeys.has(key)) return false;
      if (key === keys.session) {
        try {
          const snapshot = JSON.parse(value);
          return acceptsSnapshot(snapshot) && Object.values(snapshot.queries ?? {}).every(query => query.result === null && query.error === null);
        } catch { return false; }
      }
      if (key === keys.connection) {
        try {
          const pin = JSON.parse(value);
          const endpoint = new URL(pin.url);
          return !endpoint.username && !endpoint.password && !pin.token && !pin.password;
        } catch { return false; }
      }
      if (key === keys.history) {
        try { return Array.isArray(JSON.parse(value)) && JSON.parse(value).every((entry: Record<string, unknown>) => !entry.url && !entry.token && !entry.password); }
        catch { return false; }
      }
      return true;
    },
    releaseJournalSpace: () => resumeStorage.removeItem(keys.session),
    onState(state, error) { persistenceStatus.state = state; persistenceStatus.error = error; },
  }) : undefined;
  if (metadata) storage = metadata;
  const ready = metadata?.ready ?? Promise.resolve();
  const localConnections = persistence ? new LocalConnections(persistence) : undefined;
  void ready.then(() => localConnections?.load()).catch(() => {});
  const controller = new AbortController();
  const activity = new ActivityStore();
  const loading = new LoadingStore();
  const secureStore = new SecureStoreSvc({
    surface,
    namespace: keys.secure,
    storage: legacyStorage,
    persistence,
    persistenceReady: ready,
    historyKey: keys.history,
    // Enumeration is already projected to this profile. Include its legacy
    // hyphenated preference/snapshot keys when wiping the scoped backend.
    storagePrefix: "",
    onWipe: () => {
      while (resumeStorage.length) {
        const key = resumeStorage.key(0);
        if (key === null) break;
        resumeStorage.removeItem(key);
      }
    },
  });
  const devConsole = new DevConsoleStore();
  const connections = createConnections({
    secureStore,
    activity,
    loading,
    provider: options.connectionProvider,
    signal: controller.signal,
    console: devConsole,
    storage,
    connectionKey: keys.connection,
    resumeKey: keys.resume,
    resumeStorage,
    historyKey: keys.history,
    consumeBootstrap: legacy,
    launchBootstrap: launch,
    persistenceReady: ready,
    optInCredentials: Boolean(persistence),
  });
  const services: WorkspaceServices = {
    connection: connections.connection,
    secureStore,
    activity,
    loading,
    devConsole,
    tabs: new TabsStore(),
    queryTabs: new QueryTabsStore(activity),
    pendingChanges: new PendingChangesStore(),
    registry: createRendererRegistry(),
    workspaceSession: new WorkspaceSession(
      1000,
      storage,
      keys.session,
      resumeStorage,
      Boolean(persistence)
    ),
    theme: new ThemeStore(keys.theme, storage, false),
    skins: new SkinStore(
      options.persistenceKey ? keys.skin : null,
      storage,
      false
    ),
  };
  const session = createWorkspaceSession<WorkspaceServices, WorkspaceCommand>(
    services
  );
  session.onDispose(() => metadata?.dispose());
  session.onDispose(() => devConsole.dispose());
  session.onDispose(() => services.theme.dispose());
  session.onDispose(() => services.skins.dispose());
  session.onDispose(() => secureStore.dispose());
  session.onDispose(() => services.registry.clear());
  session.onDispose(() => services.workspaceSession.dispose());
  session.onDispose(() => services.pendingChanges.dispose());
  session.onDispose(() => services.queryTabs.clear());
  session.onDispose(() => connections.connection.dispose());
  session.onDispose(() => controller.abort());
  if (options.consoleSink)
    session.onDispose(devConsole.addSink(options.consoleSink));

  const runtime: WorkspaceRuntime = {
    ...services,
    ready,
    async flushPersistence() { await ready; await metadata?.flush(); },
    persistenceStatus,
    localConnections,
    id,
    injected: Boolean(options.connectionProvider),
    persistenceKey: options.persistenceKey,
    session,
    root: null,
    portalTarget: null,
    on: session.on,
    dispatch: session.dispatch,
    openDatabaseFile: connections.openDatabaseFile,
    unreachableConnectHint: connections.unreachableConnectHint,
    idFor: (name) => (legacy ? name : `${id}-${name}`),
    ownsKeyboard(event) {
      if (session.disposed || !runtime.root) return false;
      const path = event.composedPath();
      if (
        path.includes(runtime.root) ||
        (runtime.portalTarget && path.includes(runtime.portalTarget))
      )
        return true;
      // Only the standalone host owns shortcuts when focus is on the page.
      const doc = runtime.root.ownerDocument;
      return (
        legacy &&
        (event.target === doc.body ||
          event.target === doc ||
          event.target === doc.defaultView) &&
        doc.querySelectorAll("[data-workspace-root]").length === 1
      );
    },
    dispose() {
      runtime.root = null;
      runtime.portalTarget = null;
      session.dispose();
    },
  };
  return runtime;
}

let legacyRuntime: WorkspaceRuntime | undefined;

/** Compatibility for published components mounted outside a Workspace. */
export function getLegacyWorkspace(): WorkspaceRuntime {
  if (legacyRuntime) return legacyRuntime;
  const services: WorkspaceServices = {
    connection,
    activity: legacyActivity,
    loading: legacyLoading,
    tabs: legacyTabs,
    queryTabs: legacyQueries,
    pendingChanges: legacyChanges,
    secureStore: legacySecureStore,
    theme: legacyTheme,
    skins: legacySkins,
    workspaceSession: legacyPersistence,
    devConsole: legacyConsole,
    registry: legacyRegistry,
  };
  const session = createWorkspaceSession<WorkspaceServices, WorkspaceCommand>(
    services
  );
  legacyRuntime = {
    ...services,
    id: "legacy",
    ready: Promise.resolve(),
    async flushPersistence() {},
    persistenceStatus: { state: "legacy", error: null },
    injected: getConnectionProvider() !== provider,
    persistenceKey: "default",
    root: null,
    portalTarget: null,
    session,
    on(command, listener) {
      if (typeof window === "undefined") return session.on(command, listener);
      window.addEventListener(command, listener);
      return () => window.removeEventListener(command, listener);
    },
    dispatch(command) {
      if (typeof window === "undefined") session.dispatch(command);
      else window.dispatchEvent(new CustomEvent(command));
    },
    ownsKeyboard: () => true,
    idFor: (name) => name,
    openDatabaseFile,
    unreachableConnectHint,
    dispose() {},
  };
  return legacyRuntime;
}
