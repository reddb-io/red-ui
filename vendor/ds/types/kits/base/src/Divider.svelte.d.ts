import type { HTMLAttributes } from "svelte/elements";
import { type DividerOrientation } from "./divider.variants";
interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "class" | "role"> {
    /** Direction of both the separator semantics and its painted rule. */
    orientation?: DividerOrientation;
    /** Extra classes merged onto the canonical rule. */
    class?: string;
}
declare const Divider: import("svelte").Component<Props, {}, "">;
type Divider = ReturnType<typeof Divider>;
export default Divider;
