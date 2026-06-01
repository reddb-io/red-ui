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

export interface ConnectionBootstrapResolverOptions {
  readTauri?: BootstrapSource;
  readInjectedGlobal?: BootstrapSource;
  readUrl?: BootstrapSource;
  readPersisted?: BootstrapSource;
}

const GLOBAL_BOOTSTRAP_KEYS = [
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
    if (typeof candidate === "function") {
      return await (
        candidate as () => MaybePromise<ConnectionBootstrapPayload>
      )();
    }
    return candidate as ConnectionBootstrapPayload;
  }

  return null;
}

export function readUrlOpenContractBootstrap(
  search = typeof location === "undefined" ? "" : location.search,
  hash = typeof location === "undefined" ? "" : location.hash
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
  const resolved = await firstPresent([
    options.readTauri ?? readTauriIpcBootstrap,
    options.readInjectedGlobal ?? readInjectedGlobalBootstrap,
    options.readUrl ?? (() => readUrlOpenContractBootstrap()),
    options.readPersisted ?? (() => readPersistedLocalBootstrap()),
  ]);

  return resolved ?? { target: null };
}
