import type { PopoverContract } from "./core/contracts/popover";
import type { Snippet } from "svelte";
interface Props extends PopoverContract {
    /**
     * Optional custom Button content; `triggerLabel` stays its accessible name, so words it shows
     * must appear, in order, in `triggerLabel`, ideally first (WCAG 2.5.3, Label in Name).
     */
    trigger?: Snippet;
    /** Caller-owned Popover content. */
    children?: Snippet;
    /** Extra classes merged onto the anchored surface. */
    class?: string;
    /** Called with the next open state whenever the Popover opens or closes. */
    onopenchange?: (open: boolean) => void;
}
declare const Popover: import("svelte").Component<Props, {}, "open">;
type Popover = ReturnType<typeof Popover>;
export default Popover;
