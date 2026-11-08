import type { HTMLAttributes } from "svelte/elements";
import type { SkeletonContract } from "./core/contracts/skeleton";
interface Props extends SkeletonContract, Omit<HTMLAttributes<HTMLDivElement>, "class" | "children"> {
    /** Extra classes, merged over the placeholder's own, for example to set its size. */
    class?: string;
}
declare const Skeleton: import("svelte").Component<Props, {}, "">;
type Skeleton = ReturnType<typeof Skeleton>;
export default Skeleton;
