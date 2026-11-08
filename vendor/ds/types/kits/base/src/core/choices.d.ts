/** One flat native Select option; richer groups arrive as native option children. */
export interface SelectOption {
    /** Native serialized value. */
    value: string;
    /** Visible option name. */
    label: string;
    /** Keep this option unavailable to native selection. */
    disabled?: boolean;
}
/** Native selected values; multiple selections preserve option order. */
export type SelectValue = string | number | readonly string[];
/** Read native selection for binding and reset; callbacks keep their first-value dialect. */
export declare function readSelectValue(element: HTMLSelectElement): string | string[];
/** Apply a controlled selection after native form reset without dispatching change. */
export declare function writeSelectValue(element: HTMLSelectElement, value: SelectValue): void;
