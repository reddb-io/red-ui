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
export declare function createWorkspaceExecution<Result>(): WorkspaceExecution<Result>;
