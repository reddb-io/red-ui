import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import { type SectionHeadingLevel, type SectionHeadingSize } from "./section-heading.variants";
interface Props extends Omit<HTMLAttributes<HTMLElement>, "class" | "title"> {
    /** The heading text, rendered in the `h1` to `h6` element that `level` selects. */
    title: string;
    /** Optional supporting paragraph shown under the title; omitted when empty. */
    description?: string;
    /** Optional id for the rendered heading, for an enclosing landmark's aria-labelledby. */
    titleId?: string;
    /**
     * Outline depth from `1` to `6`, choosing the heading element independently of `size`.
     * Defaults to `2`.
     */
    level?: SectionHeadingLevel;
    /**
     * Visual size of the title: `sm`, `md`, `lg` or the Theme's `display` role, independent of
     * `level`. Defaults to `md`.
     */
    size?: SectionHeadingSize;
    /** Whether a divider is drawn under the heading and its spacing kept. Defaults to `true`. */
    rule?: boolean;
    /** Decorative content placed before the heading text. */
    leading?: Snippet;
    /** Trailing controls, such as Buttons, placed at the inline end of the heading. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const SectionHeading: import("svelte").Component<Props, {}, "">;
type SectionHeading = ReturnType<typeof SectionHeading>;
export default SectionHeading;
