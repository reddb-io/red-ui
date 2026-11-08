import type { SidebarRailItem } from "../sidebar-rail";
/** Local CSS-pixel overrides. Omitted values keep inheriting Density. */
export interface SidebarRailSizing {
    /** Item size in CSS pixels, independent of Density. Labelled items grow to fit text. The pointer-target floor still applies (24px fine, 44px coarse). */
    itemSize?: number;
    /** Glyph size in CSS pixels, independent of Density; constrained to fit the item. */
    iconSize?: number;
    /** Space between destinations and direct children of the top/bottom regions in CSS pixels; zero is valid and explicit values win. Defaults to Density gap-md for icons, Density layout-gap-sm when labels are visible (twice gap-md at current stops). */
    itemGap?: number;
    /** Space between the icon/initials and its visible label in CSS pixels; zero is valid. Omitted, labelled items use Density gap-sm. */
    labelGap?: number;
    /** Requested rail width in CSS pixels. Grows only when needed to fit the item, padding and pointer-target floor. */
    railWidth?: number;
    /** Rail inset in CSS pixels; zero is valid. Defaults to Density inset-sm. */
    railPadding?: number;
    /** Label and fallback-initial font size in CSS pixels. Omitted, typography keeps its Theme role. */
    labelSize?: number;
}
/** Portable SidebarRail properties shared by native adapters. */
export interface SidebarRailContract extends SidebarRailSizing {
    /** Accessible name for this navigation landmark. */
    label: string;
    /** Caller-owned actions, organizations, and optional add affordance. */
    items: readonly SidebarRailItem[];
    /** Caller-owned current identity (ADR 0026); SidebarRail never changes it. */
    currentId?: string;
    /** Show the destination label below its icon or initials. The rail widens and long labels wrap; defaults to icon-only. */
    showLabels?: boolean;
}
