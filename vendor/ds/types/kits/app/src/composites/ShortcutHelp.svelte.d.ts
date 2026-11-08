export type { ShortcutGroup, ShortcutCommand } from "../core/shortcut-help";
import type { ShortcutHelpContract } from "../core/contracts/shortcuthelp";
interface Props extends ShortcutHelpContract {
    /** Additional classes on the reference list. */
    class?: string;
}
declare const ShortcutHelp: import("svelte").Component<Props, {}, "open">;
type ShortcutHelp = ReturnType<typeof ShortcutHelp>;
export default ShortcutHelp;
