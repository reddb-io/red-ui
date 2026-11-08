import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type KbdSize } from "./kbd.variants";
interface Props extends Omit<HTMLAttributes<HTMLElement>, "children" | "class"> {
    /** One key, or the ordered parts of a chord. */
    keys?: readonly string[];
    /** Visual separator hidden from assistive technology. */
    separator?: string;
    /** Key cap size: `sm` or `md` (the default). It follows the surrounding type, not Density. */
    size?: KbdSize;
    /** Extra classes merged onto each key cap, not onto a chord's wrapper. */
    class?: string;
    /** A custom single key cap, replacing `keys`. */
    children?: Snippet;
}
declare const Kbd: import("svelte").Component<Props, {}, "">;
type Kbd = ReturnType<typeof Kbd>;
export default Kbd;
