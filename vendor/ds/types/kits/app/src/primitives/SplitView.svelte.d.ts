import type { SplitViewContract } from "../core/contracts/splitview";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends SplitViewContract, Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Called with the new fraction after each pointer or keyboard move. */
    onfractionchange?: (fraction: number) => void;
    /** The leading pane: left, or top. */
    start?: Snippet;
    /** The trailing pane: right, or bottom. */
    end?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const SplitView: import("svelte").Component<Props, {}, "fraction">;
type SplitView = ReturnType<typeof SplitView>;
export default SplitView;
