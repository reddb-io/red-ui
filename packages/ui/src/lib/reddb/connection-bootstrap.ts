// Portable RedDB bootstrap and URL cleanup live in the DS adapter. The host
// retains the native bridge and injects it into the shared source resolver.
import {
  resolveConnectionBootstrap as resolvePortableBootstrap,
  type ConnectionBootstrap,
  type ConnectionBootstrapPayload,
  type ConnectionBootstrapResolverOptions,
} from "@reddb-io/design-system/adapters/reddb/connection-bootstrap";
export * from "@reddb-io/design-system/adapters/reddb/connection-bootstrap";

type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

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

export function resolveConnectionBootstrap(
  options: ConnectionBootstrapResolverOptions = {}
): Promise<ConnectionBootstrap> {
  return resolvePortableBootstrap({
    ...options,
    readTauri: options.readTauri ?? readTauriIpcBootstrap,
  });
}
