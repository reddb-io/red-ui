export type { TimelineItem } from "./core/timeline";
import type { TimelineItem } from "./core/timeline";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends Omit<HTMLAttributes<HTMLOListElement>, "class"> {
    /**
     * The entries in display order; each has a `title`, a machine-readable `datetime`, visible
     * `time` text, and optionally a `description` and an `href` that makes the title a link.
     */
    items: readonly TimelineItem[];
    /** Accessible name of the list; defaults to `Timeline`. */
    label?: string;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const Timeline: import("svelte").Component<Props, {}, "">;
type Timeline = ReturnType<typeof Timeline>;
export default Timeline;
