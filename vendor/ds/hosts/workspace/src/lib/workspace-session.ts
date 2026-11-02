import { WorkspaceSnapshotStore } from "@reddb-io/design-system/app/workspace/storage";
// Workspace session persistence — snapshot the active view, open tabs, and
// router location to localStorage so the app can restore on next launch.
//
// The class is injectable (pass a `storage` in tests) and pure — no Svelte
// runes, no browser globals at import time — so the node vitest suite can
// exercise it directly with a MemStorage.

import type { QueryTabSnapshot } from "./query-tabs.svelte";
import type { Tab } from "./tabs.svelte";
import type { View } from "./router.svelte";

export interface WorkspaceSnapshot {
  view: View;
  collection: string | null;
  subpage: string | null;
  tabs: Tab[];
  activeTabId: string | null;
  queries?: Record<string, QueryTabSnapshot>;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "red-ui-workspace-session";

function acceptsSnapshot(value: unknown): value is WorkspaceSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as WorkspaceSnapshot;
  return (
    [
      "ask",
      "query",
      "collections",
      "cluster",
      "security",
      "analytics",
      "settings",
      "appearance",
    ].includes(snapshot.view) &&
    (snapshot.collection === null || typeof snapshot.collection === "string") &&
    (snapshot.subpage === null || typeof snapshot.subpage === "string") &&
    Array.isArray(snapshot.tabs) &&
    snapshot.tabs.every(
      (tab) =>
        tab &&
        typeof tab.id === "string" &&
        typeof tab.key === "string" &&
        typeof tab.label === "string" &&
        ["query", "collection", "live-changes", "welcome"].includes(tab.kind)
    ) &&
    (snapshot.activeTabId === null ||
      typeof snapshot.activeTabId === "string") &&
    (snapshot.queries === undefined ||
      (snapshot.queries !== null &&
        typeof snapshot.queries === "object" &&
        Object.values(snapshot.queries).every(
          (query) =>
            query &&
            typeof query.sql === "string" &&
            (query.error === null || typeof query.error === "string") &&
            (query.result === null ||
              (typeof query.result?.ok === "boolean" &&
                Array.isArray(query.result?.result?.records) &&
                Array.isArray(query.result?.result?.columns)))
        )))
  );
}

/** Compatibility facade over App Kit persistence for the red-ui snapshot. */
export class WorkspaceSession extends WorkspaceSnapshotStore<WorkspaceSnapshot> {
  constructor(
    debounceMs = 1000,
    storage: KeyValueStorage | null = null,
    storageKey = STORAGE_KEY,
    tabStorage:
      | (KeyValueStorage & { removeItem(key: string): void })
      | null = null
  ) {
    super({
      debounceMs,
      key: storageKey,
      storage: () => {
        const durable =
          storage ??
          (typeof localStorage !== "undefined" ? localStorage : null);
        return {
          getItem(key) {
            try {
              const cached = tabStorage?.getItem(key);
              if (cached && acceptsSnapshot(JSON.parse(cached))) return cached;
            } catch {
              /* Fall back to durable drafts. */
            }
            return durable?.getItem(key) ?? null;
          },
          setItem(key, raw) {
            // Keep result rows only for the current browser tab. Durable recovery
            // retains SQL drafts, without caching potentially large database data.
            const snapshot: WorkspaceSnapshot = JSON.parse(raw);
            const drafts = {
              ...snapshot,
              queries:
                snapshot.queries &&
                Object.fromEntries(
                  Object.entries(snapshot.queries).map(([id, query]) => [
                    id,
                    { sql: query.sql, result: null, error: null },
                  ])
                ),
            };
            try {
              durable?.setItem(key, JSON.stringify(drafts));
            } catch {
              /* Quota. */
            }
            try {
              tabStorage?.setItem(key, raw);
            } catch {
              // Remove the previous cache so a quota failure cannot restore stale SQL.
              try {
                tabStorage?.removeItem(key);
              } catch {
                /* Restricted. */
              }
            }
          },
        };
      },
      accepts: acceptsSnapshot,
    });
  }
}

export const workspaceSession = new WorkspaceSession();
