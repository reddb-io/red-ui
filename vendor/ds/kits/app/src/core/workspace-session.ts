/** One instance's services, commands and disposal boundary. */
export interface WorkspaceSession<Services, Command extends string = string> {
  /** Caller-owned services. Construct a fresh set for each workspace. */
  readonly services: Services;
  /** Aborted exactly once when this workspace is disposed. */
  readonly signal: AbortSignal;
  /** Whether this session has released its commands and resources. */
  readonly disposed: boolean;
  /** Listen to a command in this instance; returns an unsubscribe. */
  on(command: Command, listener: () => void): () => void;
  /** Dispatch synchronously to this instance's current listeners. */
  dispatch(command: Command): void;
  /** Register cleanup in reverse acquisition order; returns an unregister. */
  onDispose(cleanup: () => void): () => void;
  /** Abort work, release listeners and run every cleanup, once. */
  dispose(): void;
}

/**
 * Create a portable, per-instance session without selecting a renderer,
 * persistence backend, connection provider or appearance. Both native adapters
 * consume the same services and lifecycle contract. Importing it does no work.
 */
export function createWorkspaceSession<Services, Command extends string = string>(
  services: Services,
): WorkspaceSession<Services, Command> {
  const controller = new AbortController();
  const commands = new Map<Command, Set<() => void>>();
  const cleanups = new Set<() => void>();
  let disposed = false;

  return {
    services,
    signal: controller.signal,
    get disposed() { return disposed; },
    on(command, listener) {
      if (disposed) return () => {};
      let listeners = commands.get(command);
      if (!listeners) commands.set(command, listeners = new Set());
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size && commands.get(command) === listeners) commands.delete(command);
      };
    },
    dispatch(command) {
      if (disposed) return;
      const listeners = commands.get(command);
      if (!listeners) return;
      for (const listener of [...listeners]) {
        if (disposed) break;
        if (listeners.has(listener)) listener();
      }
    },
    onDispose(cleanup) {
      if (disposed) { cleanup(); return () => {}; }
      cleanups.add(cleanup);
      return () => { cleanups.delete(cleanup); };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      commands.clear();
      controller.abort();
      const errors: unknown[] = [];
      const pending = [...cleanups].reverse();
      cleanups.clear();
      for (const cleanup of pending) {
        try { cleanup(); } catch (error) { errors.push(error); }
      }
      if (errors.length) throw new AggregateError(errors, "Workspace cleanup failed");
    },
  };
}
