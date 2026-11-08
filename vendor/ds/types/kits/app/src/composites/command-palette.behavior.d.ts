/** One caller-owned command offered by the global command search. */
export interface CommandPaletteCommand {
    /** Stable identity returned when the command is selected. */
    id: string;
    /** Visible, searchable command name. */
    label: string;
    /** Visible category heading; commands retain their order within each category. */
    group?: string;
    /** Supporting, searchable explanation or destination. */
    description?: string;
    /** Visual shortcut reference; registration remains caller-owned. */
    shortcut?: readonly string[];
    /** Additional search terms, never rendered as labels. */
    keywords?: readonly string[];
    /** Removes only this command from interaction and selection. */
    disabled?: boolean;
    /** Caller-owned business action. */
    onselect?: () => void;
}
/** Stable grouping and shared search across both native adapters. */
export declare function commandGroups(commands: readonly CommandPaletteCommand[], query: string): {
    label: string;
    items: CommandPaletteCommand[];
}[];
