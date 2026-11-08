import type { Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
import { type ButtonSize, type ButtonTone, type ButtonVariant } from "./button.variants";
interface Common {
    /** Emphasis. Defaults to `secondary`; choose `primary` for the leading action. */
    variant?: ButtonVariant;
    /** What the action means: the shared tone vocabulary (ADR 0026). Defaults to `neutral`. */
    tone?: ButtonTone;
    /** @deprecated Renamed `tone` (ADR 0026); removed next release. */
    intent?: ButtonTone;
    /** Control height and padding. Defaults to `md`. */
    size?: ButtonSize;
    /** Waiting state: keep the label, show a spinner, and become inert. */
    loading?: boolean;
    /** Full width, for a control that should fill its column. */
    block?: boolean;
    /** Out of action, using the native state available to each element. */
    disabled?: boolean;
    /** Extra classes, merged over the variant's own. */
    class?: string;
    /** The button's label or content, rendered after the spinner while `loading`. */
    children?: Snippet;
}
interface ButtonMode extends Common, Omit<HTMLButtonAttributes, "class" | "disabled"> {
    href?: never;
}
interface AnchorMode extends Common, Omit<HTMLAnchorAttributes, "class"> {
    /** Where it goes. Its presence is what makes this an <a>. */
    href: string;
}
type Props = ButtonMode | AnchorMode;
declare const Button: import("svelte").Component<Props, {}, "">;
type Button = ReturnType<typeof Button>;
export default Button;
