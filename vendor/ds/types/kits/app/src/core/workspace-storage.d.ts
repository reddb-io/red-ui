/** Storage operations required by an independently mounted workspace. */
export interface WorkspaceStorage {
    readonly length: number;
    key(index: number): string | null;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** A private storage backend for mounts that do not opt into persistence. */
export declare class MemoryStorage implements WorkspaceStorage {
    private readonly values;
    get length(): number;
    key(index: number): string;
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
/** Limit enumeration and deletion to a workspace's own persisted keys. */
export declare function scopedStorage(storage: WorkspaceStorage, owns: (key: string) => boolean): WorkspaceStorage;
/** A minimal persistence backend for snapshot reads and writes. */
export interface WorkspaceSnapshotStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
/** Debounced, caller-validated snapshots scoped to one workspace and storage key. */
export declare class WorkspaceSnapshotStore<Snapshot> {
    private timer;
    readonly debounceMs: number;
    private readonly storage;
    private readonly key;
    private readonly accepts;
    constructor(options: {
        storage: () => WorkspaceSnapshotStorage | null;
        key: string;
        accepts: (value: unknown) => value is Snapshot;
        debounceMs?: number;
    });
    private write;
    /** Replace the pending snapshot with a debounced write. */
    schedule(snapshot: Snapshot): void;
    /** Cancel a pending write and persist immediately. */
    flush(snapshot: Snapshot): void;
    /** Cancel a pending write without changing the stored snapshot. */
    dispose(): void;
    /** Restore only JSON accepted by the host's snapshot contract. */
    restore(): Snapshot | null;
}
