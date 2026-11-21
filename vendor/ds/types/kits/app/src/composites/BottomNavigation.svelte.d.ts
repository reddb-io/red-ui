import type { PrimaryNavigationItem } from "./navigation.behavior";
export interface BottomNavigationItem extends PrimaryNavigationItem {
    /** Whether this destination's contextual menu is open, independent from currentId. */
    expanded?: boolean;
    /** Id of the contextual menu controlled by this item. */
    controls?: string;
}
import type { BottomNavigationContract } from "../core/contracts/bottomnavigation";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends BottomNavigationContract, Omit<HTMLAttributes<HTMLElement>, keyof BottomNavigationContract | "class"> {
    /** Extra classes, merged over the root slot's own, onto the `nav` element. */
    class?: string;
}
declare const BottomNavigation: import("svelte").Component<Props, {}, "">;
type BottomNavigation = ReturnType<typeof BottomNavigation>;
export default BottomNavigation;
