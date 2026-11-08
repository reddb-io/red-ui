import type { TooltipContract } from "./core/contracts/tooltip";
import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
interface Props extends TooltipContract, Omit<HTMLButtonAttributes, keyof TooltipContract | "aria-describedby" | "aria-label" | "class" | "type"> {
    /** Trigger content. */
    children?: Snippet;
    /**
     * Render your own trigger: spread `props` onto one focusable element. It
     * receives the Tooltip's event handlers and `aria-describedby`.
     */
    child?: Snippet<[{
        props: Record<string, unknown>;
    }]>;
    /** Extra classes merged onto the trigger. */
    class?: string;
}
declare const Tooltip: import("svelte").Component<Props, {}, "">;
type Tooltip = ReturnType<typeof Tooltip>;
export default Tooltip;
