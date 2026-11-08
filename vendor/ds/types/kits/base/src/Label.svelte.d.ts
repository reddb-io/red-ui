import type { Snippet } from "svelte";
import type { HTMLLabelAttributes } from "svelte/elements";
interface Props extends Omit<HTMLLabelAttributes, "children" | "class"> {
    /** The native label element for rare imperative access. */
    ref?: HTMLLabelElement;
    /** Extra classes merged onto the canonical label appearance. */
    class?: string;
    /** The label's content, usually the text naming the control it targets. */
    children?: Snippet;
}
declare const Label: import("svelte").Component<Props, {}, "ref">;
type Label = ReturnType<typeof Label>;
export default Label;
