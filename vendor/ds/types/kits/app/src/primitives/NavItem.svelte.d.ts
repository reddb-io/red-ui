import type { NavItemContract } from "../core/contracts/navitem";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends NavItemContract, Omit<HTMLAttributes<HTMLElement>, keyof NavItemContract | "class"> {
    /** @deprecated Renamed `current` (ADR 0026): `active` is `current`, `active current="step"` is `current="step"`. Removed next release. */
    active?: boolean;
    /** Before the label. */
    icon?: Snippet;
    /** After the label, pushed to the end of the item. */
    trailing?: Snippet;
    /** Full control over the label. */
    children?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const NavItem: import("svelte").Component<Props, {}, "">;
type NavItem = ReturnType<typeof NavItem>;
export default NavItem;
