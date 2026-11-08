/** A locked selection reports no change when it is already pressed. */
export declare function nextPressed(pressed: boolean, allowUnpress: boolean): boolean;
/** Keep a native radio group usable for fractional and non-finite stop counts. */
export declare function ratingStops(max: number): number[];
/** File feedback never exposes a local filesystem path. */
export declare function fileNames(files: FileList | null | undefined): string[];
/**
 * A browser may flush microtasks between reset listeners and the default action.
 * Reconcile in the next task, after native controls and outputs have reset.
 */
export declare function afterFormReset(form: HTMLFormElement | null | undefined, reconcile: () => void): () => void;
/** Resolve explicit form ownership before a child snippet has patched its native attribute. */
export declare function associatedForm(control: HTMLInputElement | HTMLFieldSetElement | null | undefined, formId?: string | null): HTMLFormElement | null;
