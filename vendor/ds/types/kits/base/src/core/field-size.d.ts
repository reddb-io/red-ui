export type FieldSize = "sm" | "md" | "lg";
export interface FieldSizeProps {
    /** The control height step; a number is the deprecated native attribute. */
    size?: FieldSize | number | null;
    /** Deprecated alias of `size` (ADR 0026), removed in the next month release. */
    controlSize?: FieldSize;
    /** The native `size` attribute: an input's visible width in characters, a select's visible rows. */
    htmlSize?: number;
}
/** A field's height step and native size attribute, from its props, warning on deprecated spellings. */
export declare function resolveFieldSize(component: string, props: FieldSizeProps, fallback?: FieldSize): {
    size: FieldSize;
    htmlSize: number | undefined;
};
