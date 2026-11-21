import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type ScrollAreaOrientation } from "./scroll-area.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "aria-label" | "children" | "class" | "role" | "tabindex"> {
    /** Accessible region name, required because this is a keyboard stop. */
    label: string;
    /** Which native overflow directions this boundary contains. */
    orientation?: ScrollAreaOrientation;
    /** Surface treatment: `outline` keeps the standalone frame and Density inset; `plain` embeds native scrolling in an existing panel. Defaults to `outline`. */
    variant?: "outline" | "plain";
    /** Extra classes, including the consumer-owned size constraint. */
    class?: string;
    /** Content that scrolls inside the region. */
    children?: Snippet;
}
declare const ScrollArea: import("svelte").Component<Props, {}, "">;
type ScrollArea = ReturnType<typeof ScrollArea>;
export default ScrollArea;
