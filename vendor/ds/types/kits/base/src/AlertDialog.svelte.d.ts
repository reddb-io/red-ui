import type { ComponentProps } from "svelte";
import Dialog from "./Dialog.svelte";
type Props = Omit<ComponentProps<typeof Dialog>, "actions" | "class" | "initialFocus" | "showClose"> & {
    /** Visible label for the destructive confirmation action. */
    confirmLabel: string;
    /** Visible label for the safe action. Defaults to `Cancel`. */
    cancelLabel?: string;
    /**
     * Called once when the destructive action is confirmed. Return a promise to
     * keep the dialog open, with the confirmation busy, until it settles: it
     * closes on fulfilment and stays open on rejection so the caller can
     * report the failure.
     */
    onconfirm?: (event: MouseEvent) => void | Promise<unknown>;
    /** Extra classes merged onto the alert surface. */
    class?: string;
};
declare const AlertDialog: import("svelte").Component<Props, {}, "open">;
type AlertDialog = ReturnType<typeof AlertDialog>;
export default AlertDialog;
