import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes } from "svelte/elements";
interface Props extends Omit<HTMLAnchorAttributes, "children" | "class" | "href"> {
    /** Destination of the link. Required: the element is always a native anchor. */
    href: string;
    /** Extra classes merged onto the canonical link appearance. */
    class?: string;
    /** The link text or content. */
    children?: Snippet;
}
declare const Link: import("svelte").Component<Props, {}, "">;
type Link = ReturnType<typeof Link>;
export default Link;
