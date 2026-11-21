/** How text that does not fit its box behaves. */
export declare const TEXT_OVERFLOWS: readonly ["wrap", "truncate", "anywhere"];
export type TextOverflow = (typeof TEXT_OVERFLOWS)[number];
/** How a row of items that does not fit its container behaves. */
export declare const ROW_OVERFLOWS: readonly ["wrap", "scroll", "collapse"];
export type RowOverflow = (typeof ROW_OVERFLOWS)[number];
/** Lines a truncated text keeps before its ellipsis. */
export declare const TRUNCATE_LINES: readonly [1, 2, 3];
export type TruncateLines = (typeof TRUNCATE_LINES)[number];
/**
 * How many leading items of a collapsing row stay visible: all of them when
 * they fit, otherwise as many as fit beside the "More" control. Widths are in
 * CSS pixels; `gap` is the space between neighbours.
 */
export declare function fitCount(itemWidths: readonly number[], available: number, moreWidth: number, gap?: number): number;
/** The row policies a component that can collapse accepts: its items wrap, or the extra ones move to "More". */
export type CollapsibleRowOverflow = Extract<RowOverflow, "wrap" | "collapse">;
/** Marks each measured item of a collapsing row with its stable id. */
export declare const OVERFLOW_ITEM_ATTRIBUTE = "data-overflow-item";
/** Marks the "More" control of a collapsing row, so its width is measured too. */
export declare const OVERFLOW_MORE_ATTRIBUTE = "data-overflow-more";
/** What a collapsing row measured: every item's width in order, the room it has, its More control and gap. */
export interface RowMeasure {
    itemWidths: readonly number[];
    available: number;
    moreWidth: number;
    gap: number;
}
/**
 * Indices that move to "More" when a row keeps its leading items (a Toolbar):
 * every item past the `fitCount`, or none when they all fit.
 */
export declare function collapseTail({ itemWidths, available, moreWidth, gap }: RowMeasure): readonly number[];
/**
 * Indices that move to "More" when a row keeps both ends (a breadcrumb trail):
 * the first item and everything from `pinned` (the current crumb, by default
 * the last) to the end always stay; the middle items nearest the end stay
 * while they fit beside the More control, and the rest collapse.
 */
export declare function collapseMiddle({ itemWidths, available, moreWidth, gap }: RowMeasure, pinned?: number): readonly number[];
/** One rendered entry of a collapsing row: an item in place, or the More control holding the hidden ones. */
export type RowEntry<Item> = {
    kind: "item";
    item: Item;
} | {
    kind: "more";
    items: readonly Item[];
};
/**
 * The order a collapsing row renders: visible items in place and one More
 * entry where the first hidden item stood, holding every hidden item in order.
 */
export declare function rowEntries<Item extends {
    id: string;
}>(items: readonly Item[], hidden: readonly string[]): readonly RowEntry<Item>[];
/** What a native adapter tells `observeRowCollapse`: the current item ids, how to plan, and where to report. */
export interface RowCollapseOptions {
    /** The row's item ids in order, read on every measure. */
    ids: () => readonly string[];
    /** The indices that move to "More" for a measure, e.g. `collapseTail` or `collapseMiddle`. */
    plan: (measure: RowMeasure) => readonly number[];
    /** Called with the ids that move to "More" whenever that set changes. */
    onchange: (hidden: readonly string[]) => void;
}
/** A live collapsing-row measurement the adapter re-runs after it renders and disposes on teardown. */
export interface RowCollapseObserver {
    /** Measure again, e.g. after the adapter rendered a new hidden set. */
    update: () => void;
    disconnect: () => void;
}
/**
 * Measure a collapsing row with a ResizeObserver and report which items move to
 * "More". Each item carries `data-overflow-item="<id>"` and the More control
 * `data-overflow-more`. A hidden item is not rendered, so its last measured
 * width stands in for it; a root that is not laid out (zero width) keeps its
 * current set rather than collapsing everything.
 */
export declare function observeRowCollapse(root: HTMLElement, options: RowCollapseOptions): RowCollapseObserver;
