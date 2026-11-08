import type { HTMLAttributes } from "svelte/elements";
import type { Tone } from "./tone";
interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    /** Consumer-owned status text; this is the semantic carrier. */
    label: string;
    /** What the status means: the shared tone vocabulary (ADR 0026). Defaults to `neutral`. */
    tone?: Tone;
    /** @deprecated Renamed `tone` (ADR 0026); removed next release. */
    status?: Tone;
    /** Draw the label beside the mark. Hidden labels remain screen-reader text. */
    showLabel?: boolean;
    /** Extra classes, merged over the root slot. */
    class?: string;
}
declare const StatusIndicator: import("svelte").Component<Props, {}, "">;
type StatusIndicator = ReturnType<typeof StatusIndicator>;
export default StatusIndicator;
