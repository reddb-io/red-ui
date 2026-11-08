import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type IndicatorPosition } from "./indicator.variants";
interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    /** Content placed around the anchored child. */
    marker: Snippet;
    /** The content whose box establishes the placement boundary. */
    children: Snippet;
    /** Logical marker anchor. Defaults to top-end. */
    position?: IndicatorPosition;
    /** Extra classes, merged over the placement root. */
    class?: string;
}
declare const Indicator: import("svelte").Component<Props, {}, "">;
type Indicator = ReturnType<typeof Indicator>;
export default Indicator;
