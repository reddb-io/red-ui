// ResultsPane tab state — Svelte 5 runes store.
//
// Each tab is keyed on (kind, key) so the same collection always
// collapses to a single tab; Cmd+click bypasses that by minting a fresh
// id so a duplicate tab opens.

import type { Capability } from "./renderers";
import {
  closeWorkspaceDocument,
  focusWorkspaceDocument,
  openWorkspaceDocument,
  updateWorkspaceDocument,
  type WorkspaceDocument,
  type WorkspaceDocuments,
} from "@reddb-io/design-system/app/workspace/documents";

export type TabKind = "collection" | "query" | "live-changes" | "welcome";

export interface Tab extends WorkspaceDocument {
  /** Unique within the pane. Stable when re-focusing existing tabs. */
  id: string;
  kind: TabKind;
  /** Display label in the tab header. */
  label: string;
  /** Stable identity for collapsing duplicates (collection name, query hash). */
  key: string;
  /** Optional capability hint forwarded to the renderer registry. */
  capability?: Capability;
  /** URL-level collection subpage (`graph`, `svg`, `table`, `json`, …). */
  subpage?: string;
  /** Renderer override (slice #9 wires the UI; the field exists today). */
  overrideCapability?: Capability;
  /** Show reddb system fields (rid, collection, kind, tenant, …) as a
   * prefix block ahead of user columns. Default false so the table shows
   * what the user wrote. */
  showSystemColumns?: boolean;
}

function uid(): string {
  // Small, debug-friendly id. Crypto.randomUUID is overkill for in-pane state.
  return Math.random().toString(36).slice(2, 10);
}

export class TabsStore {
  tabs = $state<Tab[]>([]);
  activeId = $state<string | null>(null);

  active = $derived(this.tabs.find((t) => t.id === this.activeId) ?? null);

  private snapshot(): WorkspaceDocuments<Tab> {
    return { items: this.tabs, activeId: this.activeId };
  }

  private apply(next: WorkspaceDocuments<Tab>): void {
    this.tabs = next.items;
    this.activeId = next.activeId;
  }

  /**
   * Open or focus a tab.
   * - If `forceNew` is false (default) and a tab with the same (kind,key)
   *   exists, focus that tab. Otherwise add a new one and focus it.
   * - If `forceNew` is true, always mint a fresh tab id.
   */
  open(spec: Omit<Tab, "id">, forceNew = false): Tab {
    const result = openWorkspaceDocument(this.snapshot(), spec, uid, forceNew);
    this.apply(result.state);
    return result.document;
  }

  focus(id: string): void {
    this.apply(focusWorkspaceDocument(this.snapshot(), id));
  }

  /** Close one tab, restoring remembered focus or the adjacent tab. */
  close(id: string, previousActiveId?: string | null): void {
    this.apply(closeWorkspaceDocument(this.snapshot(), id, previousActiveId));
  }

  rename(id: string, label: string): void {
    this.apply(updateWorkspaceDocument(this.snapshot(), id, { label }));
  }

  setOverride(id: string, capability: Capability | undefined): void {
    this.apply(
      updateWorkspaceDocument(this.snapshot(), id, {
        overrideCapability: capability,
      })
    );
  }

  setShowSystem(id: string, show: boolean): void {
    this.apply(
      updateWorkspaceDocument(this.snapshot(), id, { showSystemColumns: show })
    );
  }

  hydrate(savedTabs: Tab[], savedActiveId: string | null): void {
    this.tabs = savedTabs;
    this.activeId = savedActiveId;
  }

  clear(): void {
    this.tabs = [];
    this.activeId = null;
  }
}

export const tabs = new TabsStore();
