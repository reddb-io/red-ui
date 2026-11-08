import type { HTMLAttributes } from "svelte/elements";
import { type DescriptionListGap, type DescriptionListItem } from "./description-list.variants";
interface Props extends Omit<HTMLAttributes<HTMLDListElement>, "class"> {
    /**
     * The term and detail pairs, in order; each side is a string or a Snippet. Renders nothing when
     * omitted.
     */
    items?: readonly DescriptionListItem[];
    /** Density-owned space between and within items: `sm`, `md` (the default) or `lg`. */
    gap?: DescriptionListGap;
    /** Extra classes merged onto the `dl` root. */
    class?: string;
}
declare const DescriptionList: import("svelte").Component<Props, {}, "">;
type DescriptionList = ReturnType<typeof DescriptionList>;
export default DescriptionList;
