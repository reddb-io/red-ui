import type { PageHeadingContract } from "../core/contracts/pageheading";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends PageHeadingContract, Omit<HTMLAttributes<HTMLDivElement>, keyof PageHeadingContract | "class" | "title"> {
    /** Caller-owned context such as canonical Breadcrumbs. */
    context?: Snippet;
    /** Caller-owned canonical links and controls, kept in document order. */
    actions?: Snippet;
    /**
     * Extra classes, merged over the root slot's own, onto the wrapper around the title and
     * actions.
     */
    class?: string;
}
declare const PageHeading: import("svelte").Component<Props, {}, "">;
type PageHeading = ReturnType<typeof PageHeading>;
export default PageHeading;
