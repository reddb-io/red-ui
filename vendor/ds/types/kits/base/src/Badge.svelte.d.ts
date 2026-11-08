import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type BadgeVariant, type DeprecatedBadgeVariant } from "./badge.variants";
import type { Tone } from "./tone";
interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, "class"> {
    /** Status text; required so colour can never be the whole message. */
    children: Snippet;
    /** What the status means. Defaults to `neutral`. */
    tone?: Tone;
    /**
     * How strongly the tone is drawn: `tinted` (default), `filled` or
     * `outline`. `neutral` and `primary` are deprecated for one release.
     */
    variant?: BadgeVariant | DeprecatedBadgeVariant;
    /** Extra classes, merged over the canonical appearance. */
    class?: string;
}
declare const Badge: import("svelte").Component<Props, {}, "">;
type Badge = ReturnType<typeof Badge>;
export default Badge;
