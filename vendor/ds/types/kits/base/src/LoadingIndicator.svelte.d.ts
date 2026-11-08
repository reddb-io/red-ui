import type { HTMLAttributes } from "svelte/elements";
import { type LoadingIndicatorSize } from "./loading-indicator.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class"> {
    /** What is being waited for. */
    label?: string;
    /** Spinner and label size: `sm`, `md` (the default) or `lg`. */
    size?: LoadingIndicatorSize;
    /** Keep the announcement while visually hiding its sentence. */
    labelHidden?: boolean;
    /** Extra classes merged onto the indicator root. */
    class?: string;
}
declare const LoadingIndicator: import("svelte").Component<Props, {}, "">;
type LoadingIndicator = ReturnType<typeof LoadingIndicator>;
export default LoadingIndicator;
