import type { SVGAttributes } from "svelte/elements";
import type { StateIllustrationContract } from "./core/contracts/stateillustration";
interface Props extends StateIllustrationContract, Omit<SVGAttributes<SVGSVGElement>, keyof StateIllustrationContract | "class" | "children" | "role" | "aria-label" | "aria-hidden" | "width" | "height" | "color"> {
    /** Extra classes merged over the Density-owned artwork bounds. */
    class?: string;
}
declare const StateIllustration: import("svelte").Component<Props, {}, "">;
type StateIllustration = ReturnType<typeof StateIllustration>;
export default StateIllustration;
