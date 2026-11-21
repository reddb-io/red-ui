export type { PaginationPage } from "./core/pagination";
import { type PaginationPage } from "./core/pagination";
interface Props {
    /**
     * The pages in display order; each carries its page number, an `href` when it is a link,
     * and `current` marks the page being viewed.
     */
    pages: readonly PaginationPage[];
    /** Accessible name of the navigation landmark; defaults to `Pagination`. */
    label?: string;
    /**
     * Reports the page a person chose. Given, every page is a button that calls it instead of a
     * link, for state-local pagers such as the Data `DataTable`.
     */
    onpagechange?: (page: number) => void;
    /** Visible name of a Previous button before the pages; with `onpagechange` only. Disabled on the first page. */
    previousLabel?: string;
    /** Visible name of a Next button after the pages; with `onpagechange` only. Disabled on the last page. */
    nextLabel?: string;
    /** Total number of pages, so Next disables on the last page when `pages` lists only a window. Defaults to the highest listed page. */
    pageCount?: number;
    /** Polite live text after the controls announcing the position, such as `Page 2 of 9`. */
    status?: string;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const Pagination: import("svelte").Component<Props, {}, "">;
type Pagination = ReturnType<typeof Pagination>;
export default Pagination;
