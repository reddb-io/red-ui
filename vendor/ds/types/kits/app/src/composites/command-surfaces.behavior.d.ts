import type { DropdownMenuEntry } from "@reddb-io/design-system/base";
/** One top-level menu in an application Menubar. */
export interface MenubarMenu {
    id: string;
    label: string;
    items: readonly DropdownMenuEntry[];
    disabled?: boolean;
}
/** Context menus share the canonical DropdownMenu row contract. */
export type ContextMenuEntry = DropdownMenuEntry;
/** One action or destination in a Toolbar. */
export interface ToolbarItem {
    id: string;
    label: string;
    href?: string;
    disabled?: boolean;
    onselect?: () => void;
}
/** The row policy a Toolbar applies: only a horizontal toolbar collapses; a vertical one stacks (ADR 0053). */
export declare function toolbarOverflow(orientation: "horizontal" | "vertical", overflow: "wrap" | "collapse"): "wrap" | "collapse";
/**
 * Toolbar items that collapsed into More, as DropdownMenu rows: an enabled
 * destination keeps its `href`, an action keeps its `onselect`, and a disabled
 * item stays disabled.
 */
export declare function toolbarMenuItems(items: readonly ToolbarItem[]): ToolbarMenuItem[];
/** A collapsed Toolbar item as a glyph-free DropdownMenu row. */
interface ToolbarMenuItem {
    id: string;
    label: string;
    href?: string;
    disabled?: boolean;
    onselect?: () => void;
}
/** One action or destination revealed by a SpeedDial. */
export type SpeedDialAction = ToolbarItem;
export {};
