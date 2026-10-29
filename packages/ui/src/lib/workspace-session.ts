import { WorkspaceSnapshotStore } from "@reddb-io/design-system/app/workspace/storage";
// Workspace session persistence — snapshot the active view, open tabs, and
// router location to localStorage so the app can restore on next launch.
//
// The class is injectable (pass a `storage` in tests) and pure — no Svelte
// runes, no browser globals at import time — so the node vitest suite can
// exercise it directly with a MemStorage.

import type { Tab } from "./tabs.svelte";
import type { View } from "./router.svelte";

export interface WorkspaceSnapshot {
  view: View;
  collection: string | null;
  subpage: string | null;
  tabs: Tab[];
  activeTabId: string | null;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "red-ui-workspace-session";

/** Compatibility facade over App Kit persistence for the red-ui snapshot. */
export class WorkspaceSession extends WorkspaceSnapshotStore<WorkspaceSnapshot> {
  constructor(
    debounceMs = 1000,
    storage: KeyValueStorage | null = null,
    storageKey = STORAGE_KEY
  ) {
    super({
      debounceMs,
      key: storageKey,
      storage: () =>
        storage ?? (typeof localStorage !== "undefined" ? localStorage : null),
      accepts: (value): value is WorkspaceSnapshot =>
        value !== null &&
        typeof value === "object" &&
        typeof (value as { view?: unknown }).view === "string",
    });
  }
}

export const workspaceSession = new WorkspaceSession();
