/** A confirmation belongs to one overlay session; stale work cannot close a reopened session. */
export declare function createConfirmationSession(changed: (pending: boolean) => void): {
    reset(): void;
    confirm(action: () => unknown | Promise<unknown>, commit: () => void): void | Promise<void>;
};
