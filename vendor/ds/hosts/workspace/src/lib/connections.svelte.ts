// Live connections store. Delegates list/connect/whoami to a LocalUrlProvider
// from #reddb (the deep-module seam) and layers reactive Svelte
// state on top: which connection is active, its live probe (stats +
// replication), and a connected flag that gates the Connect screen.
//
// History persistence is Surface-aware:
//   - Web stores target labels only. Full URLs/credentials are session memory.
//   - Standalone stores full URLs in the vault and labels in localStorage.
//   - Embedded and managed Web boot targets store nothing.

import {
  parseConnectionString,
  type ConnectionCredentials,
  BROWSER_TRANSPORTS,
  DESKTOP_TRANSPORTS,
  DesktopError,
  EMPTY_SERVER_CAPABILITIES,
  LocalUrlProvider,
  RedClient,
  DEFAULT_PERSISTED_CONNECTION_KEY,
  isUrlReachable,
  parseBootParams,
  resolveConnectionBootstrap,
  readPersistedLocalBootstrap,
  transportForUrl,
  type Connection,
  type ConnectionBootstrap,
  type ConnectionProvider,
  type HandoffTokenConsumer,
  type ReplicationStatus,
  type ServerCapabilities,
  type Stats,
  type Transport,
} from "./reddb/index";
import {
  SurfaceHistoryStore,
  credentialPersistenceForSurface,
  type HistoryEntry,
} from "./connection-history";
import {
  secureStore as defaultSecureStore,
  type SecureStoreSvc,
} from "./secureStore.svelte";
import {
  activity as defaultActivity,
  type ActivityStore,
} from "./activity.svelte";
import { loading as defaultLoading, type LoadingStore } from "./loading.svelte";

export type { HistoryEntry } from "./connection-history";

export type ConnectionPreset = Connection & { description: string };

export const PRESETS: ConnectionPreset[] = [
  {
    id: "embedded",
    label: "Embedded",
    url: "http://localhost:5055",
    role: "embedded",
    description: "Local file via ./scripts/embedded.sh.",
  },
  {
    id: "docker-primary",
    label: "Docker primary",
    url: "http://localhost:15055",
    role: "primary",
    description: "Docker compose primary (./docker/compose.yml).",
  },
  {
    id: "docker-replica",
    label: "Docker replica",
    url: "http://localhost:25055",
    role: "replica",
    description: "Read-only mirror of docker primary.",
  },
];

interface ProbeResult {
  reachable: boolean;
  rtt_ms?: number;
  stats?: Stats;
  replication?: ReplicationStatus;
  error?: string;
}

import type { DevConsoleStore } from "./reddb/dev-console";
import type { KeyValueStorage } from "./connection-history";

export type FilePicker = (options: {
  multiple: false;
  directory: false;
  title: string;
  filters: { name: string; extensions: string[] }[];
}) => Promise<string | null>;

export interface OpenDatabaseFileResult {
  ok: boolean;
  /** True when the user dismissed the picker without choosing a file. */
  cancelled?: boolean;
  /** Human-readable reason when the flow failed (not a cancellation). */
  reason?: string;
}

export interface ConnectionServices {
  secureStore?: SecureStoreSvc;
  activity?: ActivityStore;
  loading?: LoadingStore;
  provider?: ConnectionProvider;
  console?: DevConsoleStore;
  signal?: AbortSignal;
  storage?: KeyValueStorage;
  connectionKey?: string;
  historyKey?: string;
  urlPrefix?: string;
  consumeBootstrap?: boolean;
}

/** Create connection state, provider and history for one workspace. */
export function createConnections(services: ConnectionServices = {}) {
  const secureStore = services.secureStore ?? defaultSecureStore;
  const activity = services.activity ?? defaultActivity;
  const loading = services.loading ?? defaultLoading;
  const STORAGE_KEY =
    services.connectionKey ?? DEFAULT_PERSISTED_CONNECTION_KEY;
  const storage =
    services.storage ??
    (typeof localStorage !== "undefined" ? localStorage : undefined);

  function persist(c: ConnectionPreset) {
    if (!storage) return;
    const mode = currentCredentialPersistence();
    if (mode !== "vault") {
      try {
        storage.removeItem(STORAGE_KEY);
      } catch {}
      return;
    }
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(c));
    } catch {}
  }

  const MANAGED_WEB_TOKEN_KEY =
    /(handoff|token|secret|password|passwd|auth|credential|api[-_]?key|bearer)/i;

  let managedWebHandoffActive = false;

  function markManagedWebHandoff() {
    if (secureStore.surface === "web") managedWebHandoffActive = true;
  }

  function hasManagedWebHandoff(): boolean {
    if (managedWebHandoffActive) return true;
    if (secureStore.surface !== "web" || typeof location === "undefined")
      return false;
    for (const raw of [location.search, location.hash]) {
      const params = new URLSearchParams(
        raw.startsWith("#") ? raw.slice(1) : raw
      );
      for (const key of params.keys()) {
        if (MANAGED_WEB_TOKEN_KEY.test(key)) return true;
      }
    }
    return false;
  }

  function currentCredentialPersistence() {
    return credentialPersistenceForSurface(
      secureStore.surface,
      hasManagedWebHandoff()
    );
  }

  const historyStore = new SurfaceHistoryStore({
    surface: () => secureStore.surface,
    secureStore: () => secureStore.store,
    managedWebTarget: hasManagedWebHandoff,
    storage,
    historyKey: services.historyKey,
    urlPrefix: services.urlPrefix,
  });

  /**
   * Normalize a user-typed connection string to a URL the browser can speak
   * (always http/https against the HTTP API port 5055).
   *
   * red://host[:port][/path]   → http://host:5055
   * reds://host[:port][/path]  → https://host:5055
   * http(s)://...               → unchanged
   * host[:port]                 → http://host:port|5055
   */
  function normalizeUrl(input: string): string {
    if (!input.trim()) return "";
    return parseConnectionString(input).url;
  }

  /** Backwards-compatible explicit-input API, backed by the shared URI/Base64 parser. */
  function parseConnectionInput(
    input: string
  ): ReturnType<typeof parseConnectionString> {
    if (!input.trim()) return { url: "" };
    try {
      return parseConnectionString(input);
    } catch {
      throw new Error(
        "Invalid connection string. Check the address and provide both username and password."
      );
    }
  }

  function makeCustomConnection(input: string): ConnectionPreset {
    const url = normalizeUrl(input);
    let host = url;
    try {
      host = new URL(url).host;
    } catch {}
    return {
      id: url,
      label: host || url,
      url,
      role: "primary",
      description: "User-provided connection string.",
    };
  }

  // Transport reachability is a Surface property (#34, ADR-0003): a Tauri shell
  // can open native unix/embedded connections the browser can't. Detect the
  // Surface here so the default provider declares the right reachable set.
  function isTauriSurface(): boolean {
    return (
      typeof window !== "undefined" &&
      ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
    );
  }

  function surfaceTransports(): Transport[] {
    return [...(isTauriSurface() ? DESKTOP_TRANSPORTS : BROWSER_TRANSPORTS)];
  }

  /**
   * Open a `file://` connection by asking the Tauri shell to spawn a local
   * file-backed reddb sidecar; returns the `http://127.0.0.1:<port>` URL the
   * HTTP client then talks to.
   *
   * Tauri-ness is checked HERE, at call time — not when the provider is built.
   * In `tauri dev` this module can evaluate before Tauri injects its globals, so
   * gating the resolver at construction left it unwired and `file://` fell
   * through to a raw fetch ("Load failed"). At connect time the IPC bridge is
   * always present. The browser has no filesystem/process access, so we fail
   * with a clear message there instead.
   */
  async function tauriOpenEmbedded(fileUrl: string): Promise<string> {
    if (!isTauriSurface()) {
      throw new Error(
        "file:// databases can only be opened in the desktop app"
      );
    }
    const path = fileUrl.replace(/^file:\/\//i, "");
    const { invoke } = await import("@tauri-apps/api/core");
    try {
      return await invoke<string>("open_embedded", { path });
    } catch (e) {
      // The standalone-Surface adapter seam: classify the command's structured
      // error (or a legacy string/plugin error) in exactly one place, then throw
      // a plain Error the provider can surface without any further coercion.
      throw DesktopError.from(e);
    }
  }

  /**
   * Desktop HTTP for loopback targets goes through Tauri's rust-side fetch.
   *
   * An embedded file-backed reddb (and the bundled `red` generally) emits no CORS
   * headers, so a cross-origin webview fetch from the app/dev origin to
   * `127.0.0.1:<port>` is blocked ("Load failed"). Tauri's HTTP plugin issues the
   * request from Rust, bypassing the webview's same-origin policy. Only loopback
   * targets are rerouted; remote servers keep the plain webview fetch. In the
   * browser this is always the plain fetch.
   */
  const desktopFetch: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const isLoopback =
      /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i.test(url);
    if (isTauriSurface() && isLoopback) {
      try {
        const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
        return await tauriFetch(
          input as URL | Request | string,
          init as RequestInit
        );
      } catch (e) {
        // Surface the real reason — the http plugin can reject with a bare
        // string/object that would otherwise read as "undefined" upstream.
        const reason =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : String(e);
        throw new Error(`rust-side fetch failed for ${url}: ${reason}`);
      }
    }
    return fetch(input, init);
  };

  function isHandoffTokenConsumer(
    candidate: ConnectionProvider
  ): candidate is ConnectionProvider & HandoffTokenConsumer {
    return (
      typeof (candidate as Partial<HandoffTokenConsumer>).useHandoffToken ===
      "function"
    );
  }

  // Default provider — the PWA/Desktop Surfaces' LocalUrlProvider. History is
  // split: labels in plain localStorage so the dropdown renders pre-unlock;
  // URLs encrypted at rest.
  const provider: ConnectionProvider & {
    forget(url: string): void;
  } = new LocalUrlProvider({
    presets: PRESETS,
    history: historyStore,
    transports: surfaceTransports(),
    // Always wired: the resolver itself decides (at call time) whether it's on a
    // Tauri Surface, so a not-yet-injected global at module load can't disable it.
    embeddedResolver: tauriOpenEmbedded,
    // Route loopback HTTP through Tauri's rust-side fetch (CORS bypass for the
    // embedded/local reddb); plain webview fetch everywhere else.
    clientFactory: (url, opts) =>
      new RedClient(url, {
        ...opts,
        fetch: desktopFetch,
        console: services.console,
        signal: services.signal,
      }),
    // Boot-params pre-configuration (#36, ADR-0005): a Surface (the MCP App)
    // seeds the endpoint + initial route in the app URL; the Core reads it
    // through the provider. Query tokens are ignored and hash tokens are not
    // surfaced to BootParams, so connection history cannot persist them.
    bootParams: parseBootParams(
      typeof location !== "undefined" ? location.search : "",
      typeof location !== "undefined" ? location.hash : ""
    ),
  });

  // The Core acquires its client EXCLUSIVELY through this provider (ADR-0001 —
  // ConnectionProvider is the sole connection seam). It defaults to the
  // LocalUrlProvider above, so the PWA/Desktop Connect flow is unchanged. An
  // embedding host supplies its provider (e.g. InjectedClientProvider) when
  // creating this workspace service. The acquired client is derived with this
  // instance's cancellation and console without changing the host client.
  let injectedProvider: ConnectionProvider = services.provider ?? provider;

  /** The provider the Core currently connects through. */
  function getConnectionProvider(): ConnectionProvider {
    return injectedProvider;
  }

  /**
   * Replace this service's provider before adopting its connection. The module
   * export is retained for standalone compatibility components; new Workspace
   * mounts receive their provider through createWorkspaceRuntime instead.
   */
  function setConnectionProvider(p: ConnectionProvider): void {
    injectedProvider = p;
  }

  class ConnectionStore {
    private epoch = 0;
    private disposed = false;
    /** Set after a probe succeeds for the first time — used to gate the Connect screen. */
    connected = $state<boolean>(false);
    active = $state<ConnectionPreset>(PRESETS[1]);
    probe = $state<ProbeResult>({ reachable: false });
    history = $state<HistoryEntry[]>([]);

    /**
     * The live client, supplied by the injected ConnectionProvider's connect().
     * The Core never constructs a RedClient itself (ADR-0001) — this is null
     * until the first successful connect and is replaced on every switch.
     */
    #client = $state<RedClient | null>(null);

    /**
     * Server capability map for the active connection (#22), resolved at connect.
     * Defaults to the empty (all-unsupported) map so controls stay hidden until
     * a connection proves a feature is present — a newer UI never assumes a
     * capability an older server lacks.
     */
    #capabilities = $state<ServerCapabilities>({
      ...EMPTY_SERVER_CAPABILITIES,
    });

    /**
     * Whether a real connection target has been resolved (#21, acceptance #4):
     * true when one came from Connection Bootstrap or an explicit connect; false
     * when `active` is only the default-preset fallback. Gates
     * automatic network so nothing probes before the user (or a Surface) has
     * actually chosen a target.
     */
    #targetResolved = $state<boolean>(false);

    constructor() {
      this.history = historyStore.uiEntries();
      historyStore.setOnChange(() => {
        if (!this.disposed) this.history = historyStore.uiEntries();
      });
    }

    /** See {@link ConnectionStore.#targetResolved}. */
    get targetResolved(): boolean {
      return this.#targetResolved;
    }

    get client(): RedClient | null {
      return this.#client;
    }

    /**
     * Read-only state derived from the server's reported `/stats` (#23). True
     * only when the connected server reports `read_only` — never hardcoded. When
     * the server reports no signal (the common case) this stays false and the UI
     * behaves normally.
     */
    get readOnly(): boolean {
      return this.connected && this.probe.stats?.read_only === true;
    }

    /** Optional human-facing reason for the read-only badge tooltip. */
    get readOnlyReason(): string | undefined {
      return this.probe.stats?.read_only_reason;
    }

    /**
     * Negotiated server capabilities (#22). Controls gate on these — e.g.
     * `connection.capabilities.vcs` hides version-history affordances on servers
     * that don't support VCS. All-false until a successful connect resolves it.
     */
    get capabilities(): ServerCapabilities {
      return this.#capabilities;
    }

    /**
     * Wire transports the active provider can reach on this Surface (#34). The
     * Connect UI offers only these. Falls back to the browser-reachable set when
     * a provider doesn't declare its transports.
     */
    get supportedTransports(): Transport[] {
      return getConnectionProvider().transports?.() ?? [...BROWSER_TRANSPORTS];
    }

    /**
     * Whether a user-typed connection string is reachable from this Surface.
     * The Connect UI uses this to hide/guard unreachable options so a choice
     * never ends in a transport-unsupported error.
     */
    canReach(url: string): boolean {
      return isUrlReachable(url, this.supportedTransports);
    }

    async forget(url: string) {
      await historyStore.forgetByUrl(url);
    }

    async forgetById(id: string) {
      await historyStore.forgetById(id);
    }

    /** Called from +layout once secureStore.store binds. */
    async hydrateUrls() {
      await historyStore.hydrate();
    }

    /**
     * Resolve the boot connection once, in source priority order:
     * Tauri IPC → host global → Open Contract URL/hash → persisted local store.
     * `target: null` is the well-formed empty case, so cold opens stay on the
     * Connect flow without probing a default preset.
     */
    async bootstrap(
      resolve: () => Promise<ConnectionBootstrap> = () =>
        resolveConnectionBootstrap({
          readPersisted: () =>
            readPersistedLocalBootstrap(storage, STORAGE_KEY),
          ...(services.consumeBootstrap === false
            ? {
                readTauri: () => null,
                readInjectedGlobal: () => null,
                readUrl: () => null,
              }
            : {}),
        })
    ): Promise<string | null> {
      const epoch = this.epoch;
      const boot = await resolve();
      if (this.disposed || services.signal?.aborted || epoch !== this.epoch)
        return null;
      const route = boot.route ?? null;
      if (boot.error) {
        this.disconnect();
        this.probe = { reachable: false, error: boot.error };
        return route;
      }
      if (!boot.target) return route;
      if (!boot.token) {
        await this.connectString(boot.target);
        return route;
      }
      let preset: ConnectionPreset;
      try {
        const parsed = parseConnectionString(boot.target);
        if (parsed.credentials)
          throw new Error(
            "Choose either connection credentials or a session token."
          );
        preset = makeCustomConnection(parsed.url);
      } catch (error) {
        this.disconnect();
        this.active = makeCustomConnection("");
        this.probe = {
          reachable: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid connection string.",
        };
        return route;
      }
      if (boot.token) {
        markManagedWebHandoff();
        const provider = getConnectionProvider();
        if (isHandoffTokenConsumer(provider)) {
          provider.useHandoffToken(preset.url, boot.token);
        }
      }
      await this.tryConnect(preset);
      return route;
    }

    async switch(preset: ConnectionPreset) {
      this.active = preset;
      persist(preset);
      // Switching connects through the provider — that's where the new client
      // comes from. (Previously refresh() rebuilt a client from the URL; the
      // Core no longer constructs clients itself.)
      await this.tryConnect(preset);
    }

    /** Accept a plain URI or Base64 URI, keeping credentials out of connection metadata. */
    async connectString(
      input: string,
      credentials?: ConnectionCredentials
    ): Promise<boolean> {
      try {
        const parsed = parseConnectionString(input);
        if (parsed.credentials && credentials)
          throw new Error(
            "Use credentials in either the connection string or the sign-in fields."
          );
        const auth = credentials ?? parsed.credentials;
        const preset = makeCustomConnection(parsed.url);
        if (!this.canReach(parsed.url))
          throw new Error(
            unreachableConnectHint(parsed.url) ??
              "This connection transport is not available here."
          );
        return auth
          ? await this.login(preset, auth.username, auth.password)
          : await this.tryConnect(preset);
      } catch (error) {
        this.disconnect();
        this.active = makeCustomConnection("");
        this.probe = {
          reachable: false,
          error:
            error instanceof Error
              ? error.message
              : "Invalid connection string.",
        };
        return false;
      }
    }

    async login(
      preset: ConnectionPreset,
      username: string,
      password: string
    ): Promise<boolean> {
      if (this.disposed || services.signal?.aborted) return false;
      const epoch = ++this.epoch;
      this.active = preset;
      this.#client = null;
      this.connected = false;
      this.#capabilities = { ...EMPTY_SERVER_CAPABILITIES };
      this.probe = { reachable: false };
      try {
        const targetProvider = getConnectionProvider();
        if (!isHandoffTokenConsumer(targetProvider))
          throw new Error("This connection is managed by its host.");
        const token = await new RedClient(preset.url, {
          fetch: desktopFetch,
          console: services.console,
          signal: services.signal,
        }).login(username, password);
        if (this.disposed || epoch !== this.epoch) return false;
        targetProvider.useHandoffToken(preset.url, token);
        return await this.tryConnect(preset);
      } catch (error) {
        if (this.disposed || epoch !== this.epoch) return false;
        this.probe = {
          reachable: false,
          error:
            error instanceof Error ? error.message : "Database sign-in failed.",
        };
        return false;
      }
    }

    async tryConnect(preset: ConnectionPreset): Promise<boolean> {
      if (this.disposed || services.signal?.aborted) return false;
      const epoch = ++this.epoch;
      this.active = preset;
      this.#client = null;
      this.connected = false;
      // An explicit connect attempt means a target has been chosen — unblocks
      // automatic refresh from here on (#21).
      this.#targetResolved = true;
      // Step-logged loading (#127): the connect sequence appends real,
      // timestamped steps so a slow open (sidecar spawn, readiness, handshake,
      // initial stats/schema fetch) shows honest feedback instead of a frozen
      // screen. Fast opens finish before the overlay's reveal threshold.
      loading.begin(`Opening ${preset.label}`);
      try {
        loading.step("Reaching server", preset.url);
        const active = await activity.track(`connect · ${preset.label}`, () =>
          getConnectionProvider().connect(preset.id)
        );
        if (this.disposed || epoch !== this.epoch) return false;
        // Derive an owned HTTP lifecycle without mutating the host's client.
        // Custom client implementations retain their own method behavior.
        const client =
          services.console && active.client.constructor === RedClient
            ? active.client.scoped({
                console: services.console,
                signal: services.signal,
              })
            : active.client;
        this.#client = client;
        this.active = {
          ...preset,
          ...active.connection,
          description: preset.description,
        };
        persist(this.active);
        loading.step("Fetching stats & capabilities");
        const [stats, replication, capabilities] = await Promise.all([
          activity
            .track(`connect · ${preset.label} stats`, () => client.stats())
            .catch(() => undefined),
          activity
            .track(`connect · ${preset.label} replication`, () =>
              client.replication()
            )
            .catch(() => undefined),
          // Capability negotiation fails safe to the empty map (hide controls).
          activity
            .track(`connect · ${preset.label} capabilities`, () =>
              client.capabilities()
            )
            .catch(() => ({ ...EMPTY_SERVER_CAPABILITIES })),
        ]);
        if (this.disposed || epoch !== this.epoch) return false;
        this.probe = {
          reachable: true,
          rtt_ms: active.rtt_ms,
          stats,
          replication,
        };
        this.#capabilities = capabilities;
        this.connected = true;
        loading.succeed();
        return true;
      } catch (e) {
        if (this.disposed || epoch !== this.epoch) return false;
        this.probe = { reachable: false, error: (e as Error).message };
        loading.fail((e as Error).message);
        return false;
      }
    }

    /**
     * Adopt this workspace's host-injected provider (ADR-0001 embed Surface).
     * Connects to the provider's sole connection so the Core renders connected
     * without ever showing the Connect
     * flow. Returns false (leaving the Core in its disconnected state) when the
     * provider exposes no connection.
     */
    async adoptInjected(): Promise<boolean> {
      const epoch = this.epoch;
      const [first] = await getConnectionProvider().list();
      if (this.disposed || epoch !== this.epoch || !first) return false;
      const preset: ConnectionPreset = {
        ...first,
        description: first.description ?? "Injected by the embedding host.",
      };
      return this.tryConnect(preset);
    }

    /**
     * Connect from Surface-seeded boot params. Reads the endpoint + initial route
     * the provider was seeded with and, when an endpoint is present, connects to
     * it without the Connect flow. Returns the seeded initial route/view for the
     * caller to navigate to, even if the connection fails. Tokens are never read
     * here; provider boot params intentionally exclude them.
     */
    async connectFromBootParams(): Promise<string | null> {
      const boot = getConnectionProvider().bootParams?.();
      if (!boot) return null;
      const route = boot.to ?? boot.view ?? null;
      if (!boot.endpoint) return route;
      await this.connectString(boot.endpoint);
      return route;
    }

    async refresh() {
      if (this.disposed || services.signal?.aborted) return;
      const epoch = this.epoch;
      const client = this.client;
      if (!client) {
        // No client yet — acquire one through the provider rather than building
        // it from a URL. A failed connect leaves `connected` false (the Connect
        // flow stays available on the PWA/Desktop Surfaces).
        await this.tryConnect(this.active);
        return;
      }
      try {
        const ping = await activity.track(
          `heartbeat · ${this.active.label}`,
          () => client.ping()
        );
        if (this.disposed || epoch !== this.epoch) return;
        if (!ping.ok) {
          this.probe = { reachable: false, error: ping.error };
          return;
        }
        const [stats, replication] = await Promise.all([
          activity
            .track(`heartbeat · stats`, () => client.stats())
            .catch(() => undefined),
          activity
            .track(`heartbeat · replication`, () => client.replication())
            .catch(() => undefined),
        ]);
        if (this.disposed || epoch !== this.epoch) return;
        this.probe = {
          reachable: true,
          rtt_ms: ping.rtt_ms,
          stats,
          replication,
        };
        this.connected = true;
      } catch (e) {
        if (this.disposed || epoch !== this.epoch) return;
        this.probe = { reachable: false, error: (e as Error).message };
      }
    }

    dispose() {
      this.disposed = true;
      this.disconnect();
      historyStore.setOnChange(() => {});
    }

    disconnect() {
      this.epoch += 1;
      this.connected = false;
      this.probe = { reachable: false };
      this.#client = null;
      this.#capabilities = { ...EMPTY_SERVER_CAPABILITIES };
      // Back to "no active target" — auto-network stays off until the user (or a
      // Surface) resolves a target again (#21).
      this.#targetResolved = false;
      managedWebHandoffActive = false;
    }
  }

  const connection = new ConnectionStore();

  /**
   * Honest, actionable copy for a `file://` target that can't be opened on the
   * current Surface (#123). The web build has no filesystem/process access, so a
   * local database file needs the desktop app — say that plainly instead of
   * failing with a generic transport-unsupported error (live-or-empty honesty
   * applied to the Connect flow).
   */
  const LOCAL_FILE_DESKTOP_ONLY =
    "Local database files (file://) can only be opened in the desktop app — the web version can't reach files on your machine.";

  /**
   * Explanation for an unreachable connection target, or null when the target IS
   * reachable / has no file-specific guidance. The Connect UI shows this instead
   * of the generic "unsupported transport" line when the user types a `file://`
   * URL on the web (#123). Kept in the store (not the component) so the
   * connect-flow seam is unit-testable without rendering.
   */
  function unreachableConnectHint(url: string): string | null {
    if (connection.canReach(url)) return null;
    return transportForUrl(url) === "unix" ? LOCAL_FILE_DESKTOP_ONLY : null;
  }

  /**
   * Native file picker — the subset of `@tauri-apps/plugin-dialog`'s `open` we
   * use. Injected by tests; in production it's the lazily-imported dialog plugin.
   */
  /**
   * Desktop "Open database file…" flow (#123): open the OS picker for a `.rdb`
   * file and connect to it through the existing `file://` embedded path (Tauri
   * spawns a local file-backed reddb sidecar; the UI talks HTTP to it). Only the
   * standalone (Tauri) Surface has a native picker — on the web there is none, so
   * this returns the honest desktop-only message the caller surfaces.
   *
   * `pick` is injected by tests; in production it's the Tauri dialog plugin's
   * `open`, imported lazily so the browser bundle never pulls it in.
   */
  async function openDatabaseFile(
    pick?: FilePicker
  ): Promise<OpenDatabaseFileResult> {
    if (!pick && !isTauriSurface()) {
      return { ok: false, reason: LOCAL_FILE_DESKTOP_ONLY };
    }
    const open =
      pick ??
      ((await import("@tauri-apps/plugin-dialog"))
        .open as unknown as FilePicker);
    const selected = await open({
      multiple: false,
      directory: false,
      title: "Open database file",
      filters: [{ name: "reddb database", extensions: ["rdb"] }],
    });
    if (!selected) return { ok: false, cancelled: true };
    const ok = await connection.tryConnect(
      makeCustomConnection(`file://${selected}`)
    );
    return ok
      ? { ok: true }
      : { ok: false, reason: connection.probe.error ?? "unreachable" };
  }

  return {
    provider,
    connection,
    getConnectionProvider,
    setConnectionProvider,
    normalizeUrl,
    parseConnectionInput,
    makeCustomConnection,
    LOCAL_FILE_DESKTOP_ONLY,
    unreachableConnectHint,
    openDatabaseFile,
  };
}

// Published legacy exports. Mounted workspaces create independent instances.
export const {
  provider,
  connection,
  getConnectionProvider,
  setConnectionProvider,
  normalizeUrl,
  parseConnectionInput,
  makeCustomConnection,
  LOCAL_FILE_DESKTOP_ONLY,
  unreachableConnectHint,
  openDatabaseFile,
} = createConnections();
