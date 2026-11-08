import type { HTMLAttributes } from "svelte/elements";
import type { Tone } from "./tone";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** Omit the value for indeterminate work. */
    value?: number | null;
    /** Lower bound of the scale, exposed as `aria-valuemin`; defaults to `0`. */
    min?: number;
    /**
     * Upper bound of the scale, exposed as `aria-valuemax`; defaults to `100`. A `max` not above
     * `min` is widened to one unit.
     */
    max?: number;
    /** Complete accessible name for the progress bar. */
    label?: string;
    /** Show the label and normalized value beside the track. */
    summary?: boolean;
    /** Audible value text; receives the clamped value. */
    formatValue?: (value: number) => string;
    /** What the progress means: the shared tone vocabulary (ADR 0026). Defaults to `neutral` (ink). */
    tone?: Tone;
    /** Decorative divisions, bounded to 128; omitted, uses the continuous track. The exact value remains accessible. */
    segments?: number;
    /** Maximum segments per row; omitted, keeps one row. */
    segmentColumns?: number;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const Progress: import("svelte").Component<Props, {}, "">;
type Progress = ReturnType<typeof Progress>;
export default Progress;
