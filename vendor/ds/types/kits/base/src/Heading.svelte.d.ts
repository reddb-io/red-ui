import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type HeadingLevel, type HeadingRole } from "./heading.variants";
interface Props extends Omit<HTMLAttributes<HTMLElement>, "class" | "role"> {
    /** Document outline depth: renders `h1`…`h6`. */
    level?: HeadingLevel;
    /**
     * The Theme type role it reads as — independent of `level`. Defaults to
     * `title` at level 1 and `heading` below it.
     */
    role?: HeadingRole;
    /** Extra classes merged onto the heading element. */
    class?: string;
    /** The heading text or inline content. */
    children: Snippet;
}
declare const Heading: import("svelte").Component<Props, {}, "">;
type Heading = ReturnType<typeof Heading>;
export default Heading;
