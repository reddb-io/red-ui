/** Storage operations required by an independently mounted workspace. */
export interface WorkspaceStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** A private storage backend for mounts that do not opt into persistence. */
export class MemoryStorage implements WorkspaceStorage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

/** Limit enumeration and deletion to a workspace's own persisted keys. */
export function scopedStorage(
  storage: WorkspaceStorage,
  owns: (key: string) => boolean
): WorkspaceStorage {
  const keys = () =>
    Array.from({ length: storage.length }, (_, index) =>
      storage.key(index)
    ).filter((key): key is string => key !== null && owns(key));
  return {
    get length() {
      return keys().length;
    },
    key(index) {
      return keys()[index] ?? null;
    },
    getItem(key) {
      return owns(key) ? storage.getItem(key) : null;
    },
    setItem(key, value) {
      if (!owns(key))
        throw new Error("Storage key belongs to another workspace");
      storage.setItem(key, value);
    },
    removeItem(key) {
      if (owns(key)) storage.removeItem(key);
    },
  };
}
