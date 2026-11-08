import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type AlertFeedbackRole } from "./alert.variants";
import type { Tone } from "./tone";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "role" | "title"> {
    /** What the message means: the shared tone vocabulary (ADR 0026). Defaults to `neutral`. */
    tone?: Tone;
    /** @deprecated Renamed `tone` (ADR 0026); removed next release. */
    feedback?: AlertFeedbackRole;
    /** Optional visible heading; this is message content, not the native title tooltip. */
    title?: string;
    /** Extra classes, merged over the canonical tone appearance. */
    class?: string;
    /**
     * The message body, rendered below the optional `title`. Nothing is rendered for it when
     * omitted.
     */
    children?: Snippet;
}
declare const Alert: import("svelte").Component<Props, {}, "">;
type Alert = ReturnType<typeof Alert>;
export default Alert;
