import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { ContentStateContract } from "./core/contracts/contentstate";
interface Props extends ContentStateContract, Omit<HTMLAttributes<HTMLDivElement>, "class" | "children" | "role" | "aria-busy" | "aria-label"> {
    /** Ready content. The application owns its components, data and interactions. */
    children: Snippet;
    /** Optional loading composition instead of the default Skeleton. Keep its children decorative. */
    loading?: Snippet;
    /** Optional empty composition instead of the default EmptyState. */
    empty?: Snippet;
    /** Optional error composition receiving the message; it owns error and retry announcements. */
    failure?: Snippet<[string]>;
    /** Called when the person retries after an error; adds a retry action to the default error (ADR 0056). */
    onretry?: () => void;
    /** Extra classes on the outer region, including caller-owned reserved dimensions. */
    class?: string;
}
declare const ContentState: import("svelte").Component<Props, {}, "">;
type ContentState = ReturnType<typeof ContentState>;
export default ContentState;
