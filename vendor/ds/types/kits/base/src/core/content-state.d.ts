import { type ContentLoadState } from "./contracts/contentstate";
/** Reserve the viewport in server-rendered CSS, never after a client measurement. */
export declare function contentStateHeight(height?: number | string): string | undefined;
/** Identical semantics and validation for both native adapters. */
export declare function contentStateSemantics(state: ContentLoadState, label: string, emptyTitle: string, announcement?: string): {
    busy: boolean;
    message: string;
};
