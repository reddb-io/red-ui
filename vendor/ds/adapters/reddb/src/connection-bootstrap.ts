import { parseConnectionString } from "./connection-string";
import { parseOpenContract } from "./boot-params";

export const DEFAULT_PERSISTED_CONNECTION_KEY = "red-ui:connection";

export interface ConnectionBootstrap {
  target: string | null;
  error?: string;
  token?: string;
  route?: string;
}

export type ConnectionBootstrapPayload =
  | {
      target?: unknown;
      error?: unknown;
      token?: unknown;
      route?: unknown;
    }
  | null
  | undefined;

type MaybePromise<T> = T | Promise<T>;
type BootstrapSource = () => MaybePromise<ConnectionBootstrapPayload>;

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
  const error = clean(payload.error);

  if (!target && !token && !route && !error) return null;

  return {
    target: target ?? null,
    ...(error ? { error } : {}),
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

function stripSecretsFromHistory(options: UrlBootstrapReadOptions): void {
  if (!options.consume || !options.location || !options.history) return;
  const { pathname, search, hash } = options.location;
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  let queryChanged = false;
  let hashChanged = false;
  for (const [params, isHash] of [
    [query, false],
    [fragment, true],
  ] as const) {
    for (const key of [...params.keys()]) {
      if (
        /token|secret|password|passwd|auth|credential|api[-_]?key|bearer/i.test(
          key
        )
      ) {
        params.delete(key);
        if (isHash) hashChanged = true;
        else queryChanged = true;
      }
    }
    for (const key of ["cs", "endpoint", "connection", "red_url", "red"]) {
      const value = params.get(key);
      if (value === null) continue;
      let safe: string | undefined;
      try {
        if (key === "cs") parseOpenContract(`?cs=${encodeURIComponent(value)}`);
        safe = parseConnectionString(value).url;
      } catch {
        /* Remove invalid input. */
      }
      // Fragment connections are single-use; query connections retain only their endpoint.
      if (isHash || safe !== value) {
        params.delete(key);
        if (!isHash && safe) params.set(key, safe);
        if (isHash) hashChanged = true;
        else queryChanged = true;
      }
    }
  }
  if (!queryChanged && !hashChanged) return;
  const q = queryChanged ? (query.size ? `?${query}` : "") : search;
  const h = hashChanged ? (fragment.size ? `#${fragment}` : "") : hash;
  try {
    options.history.replaceState(
      options.history.state,
      "",
      `${pathname}${q}${h}`
    );
  } catch {
    /* Best-effort cleanup in restricted embedding contexts. */
  }
}

export function readUrlOpenContractBootstrap(
  search = typeof location === "undefined" ? "" : location.search,
  hash = typeof location === "undefined" ? "" : location.hash,
  options: UrlBootstrapReadOptions = liveUrlBootstrapOptions()
): ConnectionBootstrapPayload {
  try {
    const contract = parseOpenContract(search, hash);

    if (!contract.cs && !contract.to && !contract.token) return null;
    return {
      target: contract.cs,
      token: contract.token,
      route: contract.to,
    };
  } catch {
    // An explicit invalid contract must not silently fall through to an old database.
    return {
      error: "Enter a valid HTTP connection string or its Base64 encoding.",
    };
  } finally {
    stripSecretsFromHistory(options);
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
    options.readTauri ?? (() => null),
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
