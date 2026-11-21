import type { Snippet } from "svelte";
import type { ButtonVariant } from "./button.variants";
import { type DropdownMenuEntry } from "./dropdown-menu.behavior";
import { type DropdownMenuSize } from "./dropdown-menu.variants";
type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";
interface Props {
    /**
     * Accessible name for the Button that opens the menu, and its visible text when no `trigger` is
     * given.
     */
    triggerLabel: string;
    /** Accessible name for the opened menu surface. */
    contentLabel: string;
    /**
     * The menu entries, in order: single items, or groups with an optional heading. A separator
     * divides groups.
     */
    items?: readonly DropdownMenuEntry[];
    /** Whether the menu is open, bindable. Defaults to closed. */
    open?: boolean;
    /** Called with the next open state (ADR 0026's open dialect). */
    onopenchange?: (open: boolean) => void;
    /** Button emphasis for the trigger. Defaults to `secondary`. */
    variant?: ButtonVariant;
    /** Size step for the trigger Button and the menu rows: `sm`, `md` (the default) or `lg`. */
    size?: DropdownMenuSize;
    /**
     * Preferred side of the trigger for the menu; collision handling may flip it. Defaults to
     * `bottom`.
     */
    side?: Side;
    /** Preferred alignment of the menu along the selected side. Defaults to `start`. */
    align?: Align;
    /** Distance in pixels between the trigger and the menu. Defaults to `8`. */
    sideOffset?: number;
    /** Safe distance in pixels kept between the menu and the viewport edges. Defaults to `8`. */
    collisionPadding?: number;
    /**
     * Custom content inside the trigger Button, replacing the `triggerLabel` text; `triggerLabel`
     * stays its accessible name, so words it shows must appear, in order, in `triggerLabel`,
     * ideally first (WCAG 2.5.3, Label in Name).
     */
    trigger?: Snippet;
    /** Extra classes merged onto the menu surface, not the trigger Button. */
    class?: string;
}
declare const DropdownMenu: import("svelte").Component<Props, {}, "open">;
type DropdownMenu = ReturnType<typeof DropdownMenu>;
export default DropdownMenu;
