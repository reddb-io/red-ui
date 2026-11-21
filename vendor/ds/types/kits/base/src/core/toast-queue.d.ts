import type { Tone } from "../tone";
/** A follow-up the person can take from the toast. */
export interface ToastAction {
    /** Visible and accessible label of the action. */
    label: string;
    /** Called when the person takes the action; the toast is dismissed after it. */
    onaction: () => void;
}
/** What a caller pushes. */
export interface ToastInput {
    /** Stable identity; pushing it again replaces the queued toast. */
    id?: string;
    /** What the toast means; danger and warning are announced assertively. Defaults to `neutral`. */
    tone?: Tone;
    /** Required announcement text. */
    title: string;
    /** Optional detail under the title. */
    description?: string;
    /** Optional follow-up; a toast with one stays until handled unless `duration` is set. */
    action?: ToastAction;
    /** Milliseconds shown before it leaves on its own; `null` keeps it until dismissed. */
    duration?: number | null;
}
/** A queued toast, with its identity and duration resolved. */
export interface Toast {
    id: string;
    tone: Tone;
    title: string;
    description?: string;
    action?: ToastAction;
    duration: number | null;
}
export interface ToastQueueOptions {
    /** Toasts shown at once. Defaults to 3. */
    max?: number;
    /** Default milliseconds a toast without an action is shown. Defaults to 6000. */
    duration?: number;
    /** Timer seams, for tests and non-browser hosts. */
    schedule?: (callback: () => void, delay: number) => unknown;
    cancel?: (handle: unknown) => void;
    now?: () => number;
}
export interface ToastQueue {
    /** Queue a toast and return its id. */
    push(toast: ToastInput): string;
    /** Remove a toast, shown or waiting. */
    dismiss(id: string): void;
    /** Remove every toast. */
    clear(): void;
    /** Stop every running timer, keeping the time each had left. */
    pause(): void;
    /** Restart the paused timers with the time each had left. */
    resume(): void;
    /** The toasts shown now, oldest first. */
    snapshot(): readonly Toast[];
    /** Be told whenever the shown toasts change; returns the unsubscribe. */
    subscribe(listener: (shown: readonly Toast[]) => void): () => void;
}
/** Whether a toast's announcement should interrupt (`alert`) or wait (`status`). */
export declare function toastRole(tone: Tone): "alert" | "status";
export declare function createToastQueue(options?: ToastQueueOptions): ToastQueue;
