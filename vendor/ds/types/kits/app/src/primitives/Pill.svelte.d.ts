import type { PillContract } from "../core/contracts/pill";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
interface Props extends PillContract, Omit<HTMLAttributes<HTMLSpanElement>, keyof PillContract | "class"> {
    /**
     * When given, the Pill renders a dismiss affordance and calls this. Absent,
     * it renders none — a Pill nobody can remove should not pretend otherwise.
     */
    ondismiss?: () => void;
    /** @deprecated Renamed `ondismiss` (ADR 0026); removed next release. */
    onDismiss?: () => void;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    /** The Pill's label content, rendered before the dismiss affordance. */
    children?: Snippet;
}
declare const Pill: import("svelte").Component<Props, {}, "">;
type Pill = ReturnType<typeof Pill>;
export default Pill;
