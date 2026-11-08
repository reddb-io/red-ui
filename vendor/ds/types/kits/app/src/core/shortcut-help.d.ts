export interface ShortcutCommand {
    /** Stable identity within its group. */
    id: string;
    /** Visible purpose of the command. */
    label: string;
    /** Ordered keys of one chord, supplied for the application's platform. */
    keys: readonly string[];
}
export interface ShortcutGroup {
    /** Unique group identity. */
    id: string;
    /** Context in which these commands apply. */
    label: string;
    /** Optional context explanation. */
    description?: string;
    /** Displayed commands; this component registers no keyboard handlers. */
    items: readonly ShortcutCommand[];
}
export declare function shortcutGroups(groups: readonly ShortcutGroup[]): ShortcutGroup[];
