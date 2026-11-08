import { type Snippet } from "svelte";
import type { ErrorBoundaryContract } from "../core/contracts/errorboundary";
interface Props extends ErrorBoundaryContract {
    /** Native child region; client render failures are contained here. */
    children?: Snippet;
    /** Optional caller-owned safe recovery content, receiving the error and retry operation. */
    fallback?: Snippet<[{
        error: unknown;
        retry: () => void;
    }]>;
    /** Additional classes on the failed region. */
    class?: string;
}
declare const ErrorBoundary: import("svelte").Component<Props, {}, "">;
type ErrorBoundary = ReturnType<typeof ErrorBoundary>;
export default ErrorBoundary;
