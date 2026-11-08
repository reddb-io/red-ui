import type { Snippet } from "svelte";
import type { NavigationSeam } from "./core/navigation";
interface Props extends NavigationSeam {
    /**
     * Content whose in-app links the scope routes through `navigate`; the scope adds no box of
     * its own.
     */
    children?: Snippet;
}
declare const NavigationScope: import("svelte").Component<Props, {}, "">;
type NavigationScope = ReturnType<typeof NavigationScope>;
export default NavigationScope;
