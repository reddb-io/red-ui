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
  BROWSER_TRANSPORTS,
  DESKTOP_TRANSPORTS,
  EMPTY_SERVER_CAPABILITIES,
  LocalUrlProvider,
  RedClient,
  isUrlReachable,
  parseBootParams,
  type Connection,
  type ConnectionProvider,
  type ReplicationStatus,
  type ServerCapabilities,
  type Stats,
  type Transport,
} from "#reddb";
import {
  SurfaceHistoryStore,
  credentialPersistenceForSurface,
  type HistoryEntry,
} from "./connection-history";
import { secureStore } from "./secureStore.svelte";
import { activity } from "./activity.svelte";

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

const STORAGE_KEY = "red-ui:connection";

function loadStored(): ConnectionPreset | null {
  if (currentCredentialPersistence() !== "vault") return null;
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConnectionPreset;
    if (parsed?.url && parsed?.label) return parsed;
    return null;
  } catch {
    return null;
  }
}

function persist(c: ConnectionPreset) {
  if (typeof localStorage === "undefined") return;
  const mode = currentCredentialPersistence();
  if (mode !== "vault") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {}
}

const MANAGED_WEB_TOKEN_KEY =
  /(handoff|token|secret|password|passwd|auth|credential|api[-_]?key|bearer)/i;

function hasManagedWebHandoff(): boolean {
  if (secureStore.surface !== "web" || typeof location === "undefined")
    return false;
  const params = new URLSearchParams(location.search);
  for (const key of params.keys()) {
    if (MANAGED_WEB_TOKEN_KEY.test(key)) return true;
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
export function normalizeUrl(input: string): string {
  let raw = input.trim().replace(/\/$/, "");
  if (!raw) return raw;

  if (!/:\/\//.test(raw)) raw = "http://" + raw;

  const m = raw.match(/^([a-z+]+):\/\/(.+)$/i);
  if (!m) return raw;
  const [, scheme, rest] = m;
  const s = scheme.toLowerCase();

  if (s === "red" || s === "red+tcp" || s === "red+wire") {
    const [host] = rest.split("/")[0].split(":");
    return `http://${host}:5055${rest.includes("/") ? "/" + rest.split("/").slice(1).join("/") : ""}`;
  }
  if (s === "reds" || s === "red+tls") {
    const [host] = rest.split("/")[0].split(":");
    return `https://${host}:5055`;
  }
  return raw;
}

export function makeCustomConnection(input: string): ConnectionPreset {
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

const CONNECTION_QUERY_KEYS = ["connection", "red_url", "red"];

function loadLocationConnection(): ConnectionPreset | null {
  if (typeof location === "undefined") return null;
  const params = new URLSearchParams(location.search);
  for (const key of CONNECTION_QUERY_KEYS) {
    const input = params.get(key);
    if (input) return makeCustomConnection(input);
  }
  return null;
}

// Transport reachability is a Surface property (#34, ADR-0003): a Tauri shell
// can open native unix/embedded connections the browser can't. Detect the
// Surface here so the default provider declares the right reachable set.
function surfaceTransports(): Transport[] {
  const tauri =
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
  return [...(tauri ? DESKTOP_TRANSPORTS : BROWSER_TRANSPORTS)];
}

// Default provider — the PWA/Desktop Surfaces' LocalUrlProvider. History is
// split: labels in plain localStorage so the dropdown renders pre-unlock;
// URLs encrypted at rest.
export const provider: ConnectionProvider & {
  forget(url: string): void;
} = new LocalUrlProvider({
  presets: PRESETS,
  history: historyStore,
  transports: surfaceTransports(),
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
// embedding host swaps in its own provider (e.g. InjectedClientProvider)
// before mount via setConnectionProvider(), so the host can own auth without
// the Core ever constructing a client itself.
let injectedProvider: ConnectionProvider = provider;

/** The provider the Core currently connects through. */
export function getConnectionProvider(): ConnectionProvider {
  return injectedProvider;
}

/**
 * Replace the connection provider. Call before mounting the Core (the embed
 * Surface does this with an InjectedClientProvider). Followed by
 * `connection.adoptInjected()` when the provider is already authenticated and
 * the Connect flow should be skipped entirely.
 */
export function setConnectionProvider(p: ConnectionProvider): void {
  injectedProvider = p;
}

class ConnectionStore {
  /** Set after a probe succeeds for the first time — used to gate the Connect screen. */
  connected = $state<boolean>(false);
  active = $state<ConnectionPreset>(
    loadLocationConnection() ?? loadStored() ?? PRESETS[1]
  );
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
  #capabilities = $state<ServerCapabilities>({ ...EMPTY_SERVER_CAPABILITIES });

  /**
   * Whether a real connection target has been resolved (#21, acceptance #4):
   * true when one came from the URL/boot params, a stored pin, or an explicit
   * connect — false when `active` is only the default-preset fallback. Gates
   * automatic network so nothing probes before the user (or a Surface) has
   * actually chosen a target.
   */
  #targetResolved = $state<boolean>(
    !!(loadLocationConnection() ?? loadStored())
  );

  constructor() {
    this.history = historyStore.uiEntries();
    historyStore.setOnChange(() => {
      this.history = historyStore.uiEntries();
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

  async switch(preset: ConnectionPreset) {
    this.active = preset;
    persist(preset);
    // Switching connects through the provider — that's where the new client
    // comes from. (Previously refresh() rebuilt a client from the URL; the
    // Core no longer constructs clients itself.)
    await this.tryConnect(preset);
  }

  async tryConnect(preset: ConnectionPreset): Promise<boolean> {
    // An explicit connect attempt means a target has been chosen — unblocks
    // automatic refresh from here on (#21).
    this.#targetResolved = true;
    try {
      const active = await activity.track(`connect · ${preset.label}`, () =>
        getConnectionProvider().connect(preset.id)
      );
      this.#client = active.client;
      this.active = {
        ...preset,
        ...active.connection,
        description: preset.description,
      };
      persist(this.active);
      const [stats, replication, capabilities] = await Promise.all([
        activity
          .track(`connect · ${preset.label} stats`, () => active.client.stats())
          .catch(() => undefined),
        activity
          .track(`connect · ${preset.label} replication`, () =>
            active.client.replication()
          )
          .catch(() => undefined),
        // Capability negotiation fails safe to the empty map (hide controls).
        activity
          .track(`connect · ${preset.label} capabilities`, () =>
            active.client.capabilities()
          )
          .catch(() => ({ ...EMPTY_SERVER_CAPABILITIES })),
      ]);
      this.probe = {
        reachable: true,
        rtt_ms: active.rtt_ms,
        stats,
        replication,
      };
      this.#capabilities = capabilities;
      this.connected = true;
      return true;
    } catch (e) {
      this.probe = { reachable: false, error: (e as Error).message };
      return false;
    }
  }

  /**
   * Adopt a host-injected provider (ADR-0001 embed Surface). Call after
   * setConnectionProvider(hostProvider): connects to the provider's sole
   * connection so the Core renders connected without ever showing the Connect
   * flow. Returns false (leaving the Core in its disconnected state) when the
   * provider exposes no connection.
   */
  async adoptInjected(): Promise<boolean> {
    const [first] = await getConnectionProvider().list();
    if (!first) return false;
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
    await this.tryConnect(makeCustomConnection(boot.endpoint));
    return route;
  }

  async refresh() {
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
      this.probe = { reachable: true, rtt_ms: ping.rtt_ms, stats, replication };
      this.connected = true;
    } catch (e) {
      this.probe = { reachable: false, error: (e as Error).message };
    }
  }

  disconnect() {
    this.connected = false;
    this.probe = { reachable: false };
    this.#client = null;
    this.#capabilities = { ...EMPTY_SERVER_CAPABILITIES };
    // Back to "no active target" — auto-network stays off until the user (or a
    // Surface) resolves a target again (#21).
    this.#targetResolved = false;
  }
}

export const connection = new ConnectionStore();
