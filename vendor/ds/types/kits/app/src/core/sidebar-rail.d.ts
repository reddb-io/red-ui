import type { IconGlyph } from "@reddb-io/design-system/base";
import { type NavigationMarkers } from "../composites/navigation.behavior";
export interface SidebarRailItem extends NavigationMarkers {
    /** Stable identity emitted when this item is chosen. */
    id: string;
    /**
     * Accessible name and Tooltip content for the visually compact control. A tile that shows
     * initials in icon-only mode is named `<initials>, <label>` unless `label` already holds them as words, so its
     * name contains what it shows (WCAG 2.5.3). When a notification is present, its visible count precedes the initials.
     */
    label: string;
    /** Native destination; omit for an action or contextual section menu. */
    href?: string;
    /** Optional glyph rendered only through the Base Icon contract. */
    icon?: IconGlyph;
    /**
     * Initials or a short affordance such as "+" when no glyph is supplied; defaults to the first
     * two letters of `label`, upper-cased.
     */
    fallback?: string;
    /** Present but unavailable and omitted from the rail's roving focus order. */
    disabled?: boolean;
    /** Disclosure state when the selected rail item toggles an adjacent panel. */
    expanded?: boolean;
    /** Id of the adjacent panel controlled by this disclosure item. */
    controls?: string;
    /** Draw a horizontal divider before this destination to separate groups in the vertical rail. It adds no focus stop. */
    separatorBefore?: boolean;
}
/** The text a glyph-less tile shows: its `fallback`, else the label's first two letters. */
export declare function face(item: SidebarRailItem): string;
/**
 * A tile's accessible name. WCAG 2.5.3 (Label in Name): a speech-input user
 * says what the tile shows, so visible initials lead the name unless the
 * label already holds them as words. A glyph or a symbol such as "+" shows
 * no words, and the label alone names it.
 */
export declare function nameOf(item: SidebarRailItem, labelled?: boolean): string;
