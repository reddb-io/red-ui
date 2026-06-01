import { parseOpenContract } from "./boot-params";

export const DEFAULT_PERSISTED_CONNECTION_KEY = "red-ui:connection";

export interface ConnectionBootstrap {
  target: string | null;
  token?: string;
  route?: string;
}

export type ConnectionBootstrapPayload =
  | {
      target?: unknown;
      token?: unknown;
      route?: unknown;
    }
  | null
  | undefined;

type MaybePromise<T> = T | Promise<T>;
type BootstrapSource = () => MaybePromise<ConnectionBootstrapPayload>;
type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

export interface BootstrapStorage {
  getItem(key: string): string | null;
}

export interface UrlBootstrapLocation {
  pathname: string;
  search: string;
  hash: string;
}

export interface UrlBootstrapHistory {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

export interface UrlBootstrapReadOptions {
  consume?: boolean;
  location?: UrlBootstrapLocation;
  history?: UrlBootstrapHistory;
}

export interface ConnectionBootstrapResolverOptions {
  readTauri?: BootstrapSource;
  readInjectedGlobal?: BootstrapSource;
  readUrl?: BootstrapSource;
  readPersisted?: BootstrapSource;
}

const GLOBAL_BOOTSTRAP_KEYS = [
  "__RED_BOOTSTRAP__",
  "__RED_UI_CONNECTION_BOOTSTRAP__",
  "__RED_UI_BOOTSTRAP__",
];

function clean(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeBootstrap(
  payload: ConnectionBootstrapPayload
): ConnectionBootstrap | null {
  if (!payload || typeof payload !== "object") return null;

  const target = clean(payload.target);
  const token = clean(payload.token);
  const route = clean(payload.route);

  if (!target && !token && !route) return null;

  return {
    target: target ?? null,
    ...(token ? { token } : {}),
    ...(route ? { route } : {}),
  };
}

async function firstPresent(
  sources: BootstrapSource[]
): Promise<ConnectionBootstrap | null> {
  for (const source of sources) {
    let resolved: ConnectionBootstrap | null;
    try {
      resolved = normalizeBootstrap(await source());
    } catch {
      resolved = null;
    }
    if (resolved) return resolved;
  }
  return null;
}

async function loadTauriInvoke(): Promise<TauriInvoke | null> {
  if (typeof window === "undefined") return null;
  if (!("__TAURI_INTERNALS__" in window || "__TAURI__" in window)) return null;

  try {
    const mod = await import("@tauri-apps/api/core");
    return mod.invoke as TauriInvoke;
  } catch {
    return null;
  }
}

export async function readTauriIpcBootstrap(
  invoke?: TauriInvoke
): Promise<ConnectionBootstrapPayload> {
  const call = invoke ?? (await loadTauriInvoke());
  if (!call) return null;

  try {
    return await call<ConnectionBootstrapPayload>("connection_bootstrap");
  } catch {
    return null;
  }
}

export async function readInjectedGlobalBootstrap(
  root: unknown = globalThis
): Promise<ConnectionBootstrapPayload> {
  if (!root || typeof root !== "object") return null;
  const bag = root as Record<string, unknown>;

  for (const key of GLOBAL_BOOTSTRAP_KEYS) {
    const candidate = bag[key];
    if (!candidate) continue;
    try {
      if (typeof candidate === "function") {
        return await (
          candidate as () => MaybePromise<ConnectionBootstrapPayload>
        )();
      }
      return candidate as ConnectionBootstrapPayload;
    } finally {
      try {
        delete bag[key];
      } catch {
        bag[key] = undefined;
      }
    }
  }

  return null;
}

function liveUrlBootstrapOptions(): UrlBootstrapReadOptions {
  return {
    consume: true,
    location:
      typeof location === "undefined"
        ? undefined
        : {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
    history:
      typeof history === "undefined"
        ? undefined
        : {
            state: history.state,
            replaceState: (data, unused, url) =>
              history.replaceState(data, unused, url),
          },
  };
}

function stripTokenFromHistory(options: UrlBootstrapReadOptions): void {
  if (!options.consume || !options.location || !options.history) return;
  const hash = options.location.hash;
  if (!hash) return;

  const params = new URLSearchParams(
    hash.startsWith("#") ? hash.slice(1) : hash
  );
  if (!params.has("token")) return;
  params.delete("token");

  const nextHash = params.toString();
  const nextUrl = `${options.location.pathname}${options.location.search}${
    nextHash ? `#${nextHash}` : ""
  }`;
  try {
    options.history.replaceState(options.history.state, "", nextUrl);
  } catch {
    /* best-effort URL cleanup */
  }
}

export function readUrlOpenContractBootstrap(
  search = typeof location === "undefined" ? "" : location.search,
  hash = typeof location === "undefined" ? "" : location.hash,
  options: UrlBootstrapReadOptions = liveUrlBootstrapOptions()
): ConnectionBootstrapPayload {
  try {
    const contract = parseOpenContract(search, hash);
    if (contract.token) stripTokenFromHistory(options);
    if (!contract.cs && !contract.to && !contract.token) return null;
    return {
      target: contract.cs,
      token: contract.token,
      route: contract.to,
    };
  } catch {
    return null;
  }
}

function defaultStorage(): BootstrapStorage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readPersistedLocalBootstrap(
  storage = defaultStorage(),
  key = DEFAULT_PERSISTED_CONNECTION_KEY
): ConnectionBootstrapPayload {
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { url?: unknown };
    const target = clean(parsed?.url);
    return target ? { target } : null;
  } catch {
    return null;
  }
}

export async function resolveConnectionBootstrap(
  options: ConnectionBootstrapResolverOptions = {}
): Promise<ConnectionBootstrap> {
  const readUrl = options.readUrl ?? (() => readUrlOpenContractBootstrap());
  const resolved = await firstPresent([
    options.readTauri ?? readTauriIpcBootstrap,
    options.readInjectedGlobal ?? readInjectedGlobalBootstrap,
    readUrl,
    options.readPersisted ?? (() => readPersistedLocalBootstrap()),
  ]);

  if (resolved && !options.readUrl) {
    try {
      readUrlOpenContractBootstrap();
    } catch {
      /* best-effort live URL cleanup after a higher-priority boot source */
    }
  }

  return resolved ?? { target: null };
}
