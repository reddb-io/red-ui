import type { TabItem, TabsSize } from "../../tabs.variants";
/** Canonical portable Tabs properties, shared by native adapters. */
export interface TabsContract {
    /** Accessible name for the tablist. */
    label: string;
    /** Stable values and visible labels; panel content remains caller-owned. */
    items: readonly TabItem[];
    /** Selected tab value; defaults to the first enabled tab. */
    value?: string;
    /**
         * Axis of the tablist, which sets `aria-orientation` and the arrow keys that move between
         * tabs. Defaults to `horizontal`.
         */
    orientation?: "horizontal" | "vertical";
    /** Disables every tab, so none can be selected. */
    disabled?: boolean;
    /** Select the panel containing a same-page fragment target. */
    followHash?: boolean;
    /**
         * The trigger height step, matching Button's and the fields' `size` (default `sm`, the compact tablist Tabs always drew; pass `md` beside default-size controls), so the
         * tablist sits level with peers of the same size (ADR 0054).
         */
    size?: TabsSize;
    /** What a tab list wider than its container does: `wrap` (more lines, the default) or `scroll` (one line, ADR 0053). */
    overflow?: "wrap" | "scroll";
    /** Extra classes merged onto the tablist. */
    listClass?: string;
    /** Extra classes merged onto every tab trigger Button. */
    triggerClass?: string;
    /** Extra classes merged onto every tab panel. */
    contentClass?: string;
}
