import type { DialogContract } from "./core/contracts/dialog";
import { type Snippet } from "svelte";
import type { HTMLDialogAttributes } from "svelte/elements";
interface Props extends DialogContract, Omit<HTMLDialogAttributes, keyof DialogContract | "aria-describedby" | "aria-labelledby" | "class"> {
    /** Replaces the visible title and default close control with a caller-owned header. The required title remains the accessible name; the header receives the canonical close operation. A custom header keeps the body in its own scrolling region. */
    header?: Snippet<[{
        close: () => void;
    }]>;
    /**
     * Optional custom trigger content; `triggerLabel` remains its accessible name. Words it shows
     * must appear, in order, in `triggerLabel`, ideally first (WCAG 2.5.3, Label in Name).
     */
    trigger?: Snippet;
    /** Dialog body. */
    children?: Snippet;
    /** Optional action region with the canonical close operation. */
    actions?: Snippet<[{
        close: () => void;
    }]>;
    /** Called whenever the Dialog opens or closes, by any path. */
    onopenchange?: (open: boolean) => void;
    /** Extra classes merged onto the modal surface. */
    class?: string;
}
declare const Dialog: import("svelte").Component<Props, {}, "open">;
type Dialog = ReturnType<typeof Dialog>;
export default Dialog;
