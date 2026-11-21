import type { CollectionStateContract, TimelineItem } from "@reddb-io/design-system/base";
type ActivityFeedItem = TimelineItem;
/** Portable ActivityFeed properties shared by native adapters; its state follows the shared collection contract (ADR 0056). */
export interface ActivityFeedContract extends CollectionStateContract {
    /** Caller-owned activity in chronological display order. */
    items: readonly ActivityFeedItem[];
    /** Accessible name for this activity stream. */
    label?: string;
}
export {};
