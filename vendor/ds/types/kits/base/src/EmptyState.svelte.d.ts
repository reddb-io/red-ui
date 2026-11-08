import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type EmptyStateSize } from "./empty-state.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "title"> {
    /** What is empty, in a few words. */
    title: string;
    /** Why it is empty, or what would fill it. */
    description?: string;
    /** A literal command, path, or key that would fill it. */
    hint?: string;
    /** Defaults to `md`. */
    size?: EmptyStateSize;
    /** Draw the dashed outline around the region. Defaults to true. */
    bordered?: boolean;
    /** An icon or illustration, rendered decoratively above the title. */
    media?: Snippet;
    /** Caller-owned controls rendered after the explanation. */
    actions?: Snippet;
    /** Extra classes merged over the root slot. */
    class?: string;
}
declare const EmptyState: import("svelte").Component<Props, {}, "">;
type EmptyState = ReturnType<typeof EmptyState>;
export default EmptyState;
