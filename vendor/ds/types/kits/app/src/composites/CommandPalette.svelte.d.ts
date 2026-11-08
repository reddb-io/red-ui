import type { CommandPaletteContract } from "../core/contracts/commandpalette";
import { type CommandPaletteCommand } from "./command-palette.behavior";
interface Props extends CommandPaletteContract {
    /** Reports every open-state request. */
    onopenchange?: (open: boolean) => void;
    /** Additional wrapper classes. */
    class?: string;
    /** Reports selection after the command action. Modal presentation closes before invoking actions. */
    onselect?: (command: CommandPaletteCommand) => void;
}
declare const CommandPalette: import("svelte").Component<Props, {}, "open">;
type CommandPalette = ReturnType<typeof CommandPalette>;
export default CommandPalette;
