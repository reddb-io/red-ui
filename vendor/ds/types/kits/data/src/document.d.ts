/** Pure extraction and filtering for the dependency-free Document viewer. */
export type DocumentValue = Readonly<Record<string, unknown>>;
export interface DocumentSummary {
    id: string;
    title: string;
    subtitle: string;
}
export interface DocumentItem {
    document: DocumentValue;
    index: number;
    summary: DocumentSummary;
}
export interface DocumentField {
    key: string;
    value: unknown;
    text: string;
}
/** Caller-supplied document views keep domain-specific representation outside the Kit. */
export interface DocumentPresentation {
    summary: DocumentSummary;
    body: string;
    fields: readonly DocumentField[];
    raw: string;
    /** Optional searchable content; title and subtitle are always included. */
    searchText?: string;
}
export type DocumentPresenter = (document: DocumentValue, index: number) => DocumentPresentation;
/** Extract stable master-list identity and display text from common document fields. */
export declare function extractDocumentSummary(document: DocumentValue, index: number): DocumentSummary;
/** Stable, dependency-free presentation for field and raw modes. */
export declare function formatDocumentValue(value: unknown): string;
/** Select the conventional long-form field shown by body mode. */
export declare function documentBody(document: DocumentValue): string;
/** Return caller fields in insertion order for the fields detail mode. */
export declare function documentFields(document: DocumentValue): readonly DocumentField[];
/** Pretty JSON used by raw mode, with a safe fallback for non-JSON values. */
export declare function documentRaw(document: DocumentValue): string;
/** Default projection for JSON-like documents. */
export declare function presentDocument(document: DocumentValue, index: number): DocumentPresentation;
/** Filter documents without changing their original indexes or caller-owned values. */
export declare function filterDocuments(documents: readonly DocumentValue[], query: string, present?: DocumentPresenter): readonly DocumentItem[];
/** Master-detail presentation modes shared by native renderers. */
export type DocumentMode = "body" | "fields" | "raw";
/** Resolve selection within filtered results without changing the caller's selection. */
export declare function visibleDocumentIndex(items: readonly DocumentItem[], selected: number | null): number | null;
