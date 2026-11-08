export type { SidebarRailItem } from "../core/sidebar-rail";
import type { SidebarRailContract } from "../core/contracts/sidebarrail";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends SidebarRailContract, Omit<HTMLAttributes<HTMLElement>, "class" | "onselect"> {
    /** @deprecated Renamed `currentId` (ADR 0026); removed next release. */
    selectedId?: string;
    /** Emits the chosen identity without retaining organization state. */
    onselect?: (id: string) => void;
    /** Brand or home control placed above the roving item collection. */
    top?: Snippet;
    /** Account control placed below the roving item collection. */
    bottom?: Snippet;
    /** Extra classes merged onto the navigation landmark. */
    class?: string;
}
declare const SidebarRail: import("svelte").Component<Props, {}, "">;
type SidebarRail = ReturnType<typeof SidebarRail>;
export default SidebarRail;
