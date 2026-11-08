import type { Snippet } from "svelte";
import type { OutcomeScreenContract } from "../core/contracts/outcomescreen";
interface Props extends OutcomeScreenContract {
    /** Optional product identity, supplied by the host. */
    identity?: Snippet;
    /** Caller-owned recovery, continuation or close controls. */
    actions?: Snippet;
    /** Extra classes on the outer region. */
    class?: string;
}
declare const OutcomeScreen: import("svelte").Component<Props, {}, "">;
type OutcomeScreen = ReturnType<typeof OutcomeScreen>;
export default OutcomeScreen;
