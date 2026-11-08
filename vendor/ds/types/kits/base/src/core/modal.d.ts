/** A host shell must yield its shortcuts to events originating in a modal, including shadow DOM. */
export declare function isEventFromModal(event: Event): boolean;
export declare const modalFocusable = "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex=\"-1\"])";
export interface ModalOptions {
    initialFocus(): "body" | "actions";
    dismissible(): boolean;
    requestOpen(open: boolean): void;
}
export declare function createModalController(dialog: HTMLDialogElement, options: ModalOptions): {
    sync: (open: boolean) => void;
    destroy(): void;
};
