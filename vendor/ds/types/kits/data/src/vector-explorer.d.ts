export interface VectorRow {
    index: number;
    id: string;
    vectorColumn: string | null;
    vector: number[];
    dimension: number;
    scalarColumn: string | null;
    scalar: number | null;
    metadata: Record<string, unknown>;
}
export declare function vectorMagnitude(v: number[]): number;
export declare function scalarLabel(row: Pick<VectorRow, "scalarColumn">): string;
export declare function compactValue(v: unknown): string;
export declare function parseVectorInput(input: string): number[];
export type VectorSearchRequest = ({
    kind: "text";
    text: string;
} | {
    kind: "vector";
    vector: number[];
}) & {
    limit: number;
};
export interface VectorSearchResponse {
    rows: readonly VectorRow[];
    note?: string;
}
export declare function filterVectorRows(rows: readonly VectorRow[], filter: string): VectorRow[];
export declare function vectorSearchRequest(kind: "text" | "vector", input: string, limit: number): VectorSearchRequest;
export declare function vectorCoordinatePercent(value: number, vector: readonly number[]): number;
