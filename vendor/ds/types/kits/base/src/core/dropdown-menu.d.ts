/** One selectable row in a DropdownMenu. */
export interface DropdownMenuItem<Glyph = unknown> {
    id: string;
    label: string;
    /** Optional decorative glyph rendered before the label through the DS Icon contract. */
    icon?: Glyph;
    /** A keyboard shortcut rendered as semantic key caps after the label. */
    shortcut?: readonly string[];
    href?: string;
    disabled?: boolean;
    onselect?: () => void;
}
/** A named or unnamed run of related menu rows. */
export interface DropdownMenuGroup<Glyph = unknown> {
    heading?: string;
    items: readonly DropdownMenuItem<Glyph>[];
}
export type DropdownMenuEntry<Glyph = unknown> = DropdownMenuItem<Glyph> | DropdownMenuGroup<Glyph>;
export declare function isDropdownMenuGroup<Glyph>(entry: DropdownMenuEntry<Glyph>): entry is DropdownMenuGroup<Glyph>;
/** Fold consecutive bare rows into groups while retaining explicit group boundaries. */
export declare function dropdownMenuGroups<Glyph>(entries: readonly DropdownMenuEntry<Glyph>[]): readonly DropdownMenuGroup<Glyph>[];
/** Flatten grouped entries back into their source-order menu rows. */
export declare function dropdownMenuItems<Glyph>(entries: readonly DropdownMenuEntry<Glyph>[]): readonly DropdownMenuItem<Glyph>[];
