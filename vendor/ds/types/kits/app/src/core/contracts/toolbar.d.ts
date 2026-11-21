import type { ToolbarItem } from "../../composites/command-surfaces.behavior";
import type { ToolbarOverflow, ToolbarSize } from "../../composites/toolbar.variants";
type Orientation = "horizontal" | "vertical";
/** Portable Toolbar properties shared by native adapters. */
export interface ToolbarContract {
    /** Accessible name for the toolbar. */
    label: string;
    /**
         * Actions and destinations in order; an enabled item with an `href` renders as a link, any
         * other as a button that calls its `onselect`.
         */
    items?: readonly ToolbarItem[];
    /**
         * Layout direction and the arrow-key axis: `horizontal` or `vertical`. Defaults to
         * `horizontal`.
         */
    orientation?: Orientation;
    /** Size of the item controls: `sm`, `md` or `lg`. Defaults to `md`. */
    size?: ToolbarSize;
    /**
         * Whether arrow-key focus wraps from the last item back to the first, and the reverse. Defaults
         * to `true`.
         */
    loop?: boolean;
    /**
         * What a horizontal toolbar does when its items do not fit (ADR 0053): `wrap` adds lines, or
         * `collapse` keeps one line, measures it and moves the items past the fit into a labelled
         * "More" menu. A collapsing toolbar takes the full width its container gives it; a vertical
         * toolbar always stacks. Defaults to `wrap`.
         */
    overflow?: ToolbarOverflow;
    /** Accessible name and visible text of the "More" menu trigger when items collapse. Defaults to `More`. */
    moreLabel?: string;
}
export {};
