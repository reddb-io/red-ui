import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type StackAlign, type StackDirection, type StackGap, type StackJustify } from "./stack.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /**
     * Space between children. Each value names a Density-owned role: the
     * component tier (`sm`, `md`, `lg`), the layout tier (`layout-sm`,
     * `layout-md`, `layout-lg`) or the section tier (`section`), or `none` for contiguous children. Defaults to `layout-md`.
     */
    gap?: StackGap;
    /** The main axis: `column` (the default) or `row`. */
    direction?: StackDirection;
    /** Cross-axis alignment. Defaults to `stretch`. */
    align?: StackAlign;
    /** Main-axis distribution. Defaults to `start`. */
    justify?: StackJustify;
    /** Wrap children onto new lines when they run out of room. */
    wrap?: boolean;
    /** Extra classes merged onto the flow. */
    class?: string;
    /** The items the flow arranges, spaced by `gap`. */
    children?: Snippet;
}
declare const Stack: import("svelte").Component<Props, {}, "">;
type Stack = ReturnType<typeof Stack>;
export default Stack;
