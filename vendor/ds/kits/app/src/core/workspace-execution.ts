/** One execution belongs to one workspace and document; no database or UI is imported. */
export interface WorkspaceExecution<Result> {
  /** Start only when no execution is already active for this document. */
  run(id: string, execute: (signal: AbortSignal) => Promise<Result>, handlers: {
    success(result: Result): void;
    failure(error: unknown): void;
    finish(): void;
  }): Promise<boolean>;
  /** Abort an active execution and ignore any eventual result. */
  cancel(id: string): boolean;
  /** Abort all executions and ignore their eventual results. */
  clear(): void;
}

/** Create a private execution coordinator for a workspace instance. */
export function createWorkspaceExecution<Result>(): WorkspaceExecution<Result> {
  const active = new Map<string, AbortController>();
  return {
    async run(id, execute, handlers) {
      if (active.has(id)) return false;
      const controller = new AbortController();
      active.set(id, controller);
      try {
        const result = await execute(controller.signal);
        if (active.get(id) === controller) handlers.success(result);
      } catch (error) {
        if (active.get(id) === controller && !controller.signal.aborted) handlers.failure(error);
      } finally {
        if (active.get(id) === controller) {
          active.delete(id);
          handlers.finish();
        }
      }
      return true;
    },
    cancel(id) {
      const controller = active.get(id);
      if (!controller) return false;
      active.delete(id);
      controller.abort();
      return true;
    },
    clear() {
      const controllers = [...active.values()];
      active.clear();
      for (const controller of controllers) controller.abort();
    },
  };
}
