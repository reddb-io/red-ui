import type { CommandPaletteCommand } from "../../composites/command-palette.behavior";
/** Portable CommandPalette properties shared by native adapters. */
export interface CommandPaletteContract {
    /** Accessible trigger label. Omit in dialog presentation for caller-owned invocation. */
    triggerLabel?: string;
    /** Presentation surface. Defaults to anchored popover; dialog uses the native modal top layer. */
    presentation?: "popover" | "dialog";
    /** Search input placeholder. */
    placeholder?: string;
    /** Explanation when no commands match. Defaults to "No matching commands". */
    emptyLabel?: string;
    /** Accessible name for the palette surface. */
    contentLabel: string;
    /** Visible Field label for command search. */
    label: string;
    /** Caller-owned command names and business actions. */
    commands?: readonly CommandPaletteCommand[];
    /** Whether the palette is open: `bind:open` (ADR 0026). */
    open?: boolean;
    /** Disables the trigger Button, so the palette cannot be opened. Defaults to `false`. */
    disabled?: boolean;
    /**
         * Extra classes, merged over the content slot's own, onto the Popover surface that holds the
         * search.
         */
    contentClass?: string;
    /** Extra classes merged onto the command search input. */
    inputClass?: string;
}
