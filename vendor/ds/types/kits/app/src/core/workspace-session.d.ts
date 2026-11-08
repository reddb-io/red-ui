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
export declare function createWorkspaceSession<Services, Command extends string = string>(services: Services): WorkspaceSession<Services, Command>;
