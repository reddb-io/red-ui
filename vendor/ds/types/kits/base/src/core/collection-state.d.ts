import type { ContentLoadState } from "./contracts/contentstate";
/** Where a collection's data stands. */
export declare const COLLECTION_STATES: readonly ["loading", "ready", "empty", "error", "refreshing"];
export type CollectionState = (typeof COLLECTION_STATES)[number];
/** The state props every collection takes. */
export interface CollectionStateContract {
    /** Where the data stands. Unset means ready, and empty when there are no items. `refreshing` keeps the items and marks the collection busy; `error` with items keeps them as stale under an alert. */
    state?: CollectionState;
    /** Message shown when the data failed to load. */
    errorMessage?: string;
    /** Visible and accessible label of the retry action. Defaults to Retry. */
    retryLabel?: string;
    /** Skeleton rows shown while loading, at the control-height rhythm. Defaults to 5. */
    loadingRows?: number;
}
/** What a collection's body shows for its state and item count. */
export interface CollectionView {
    /** The ContentState to render instead of the items, or null to render the items. */
    placeholder: ContentLoadState | null;
    /** Whether the collection is busy (loading or refreshing). */
    busy: boolean;
    /** Whether items are shown although the latest load failed. */
    stale: boolean;
}
export declare function collectionView(state: CollectionState | undefined, itemCount: number): CollectionView;
