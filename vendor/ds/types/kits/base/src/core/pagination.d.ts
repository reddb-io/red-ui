export interface PaginationPage {
    /** Visible page number and stable link identity. */
    page: number;
    /** Native link destination. Required unless the Pagination reports pages through its page-change callback instead. */
    href?: string;
    /** Whether this page is currently viewed. */
    current?: boolean;
}
/** Where the Previous and Next controls of a Pagination lead. */
export interface PaginationSteps {
    /** The page currently viewed; the first listed page when none is marked current. */
    current: number;
    /** The page Previous leads to, or null on the first page. */
    previous: number | null;
    /** The page Next leads to, or null on the last page. */
    next: number | null;
}
/**
 * A contiguous window of at most `size` pages that holds the current page,
 * centred on it where the page count allows. A state-local pager (Data
 * `DataTable`) lists this window between its Previous and Next controls.
 */
export declare function paginationWindow(page: number, pageCount: number, size?: number): PaginationPage[];
/**
 * Identical validation for both native adapters: a Pagination that does not
 * report pages renders links, and a link without a destination is refused
 * loudly rather than rendered as a dead anchor.
 */
export declare function validatePagination(pages: readonly PaginationPage[], reportsPages: boolean): void;
/** The current page and the pages Previous and Next lead to. `pageCount` defaults to the highest listed page. */
export declare function paginationSteps(pages: readonly PaginationPage[], pageCount?: number): PaginationSteps;
