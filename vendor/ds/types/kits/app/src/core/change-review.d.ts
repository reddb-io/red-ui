export type ReviewState = "pending" | "applying" | "applied" | "failed";
export interface ReviewChange {
    /** Unique stable identity; never a row position. */
    id: string;
    /** Human-readable changed entity or property. */
    label: string;
    /** Caller-formatted previous value; never executed. */
    before: string;
    /** Caller-formatted proposed value; never executed. */
    after: string;
    /** Observed result; omitted means pending. */
    state?: ReviewState;
    /** Caller-safe failure explanation. */
    error?: string;
    /** Optional context for the change. */
    description?: string;
}
export declare function reviewChanges(items: readonly ReviewChange[]): {
    items: readonly ReviewChange[];
    actionable: string[];
    applying: boolean;
};
