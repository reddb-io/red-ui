import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
interface Props extends Omit<HTMLButtonAttributes, "aria-pressed" | "children" | "class" | "onclick" | "type"> {
    /** Required visible and accessible control name. */
    label: string;
    /** Current pressed state, bindable for controlled consumers. */
    pressed?: boolean;
    /** Initial uncontrolled state; later changes do not replace the user's choice. */
    defaultPressed?: boolean;
    /** Group composition can prohibit removing its sole selection. */
    allowUnpress?: boolean;
    /** Disables the button, so activation neither changes `pressed` nor reports a change. */
    disabled?: boolean;
    /** Extra classes merged onto the underlying Button, over the pressed-state styling. */
    class?: string;
    /**
     * Optional visual content; `label` remains the stable accessible name, so words it shows must
     * appear, in order, in `label`, ideally first (WCAG 2.5.3, Label in Name).
     */
    children?: Snippet;
    /**
     * Called with the click event after the pressed state has been updated; skipped while
     * disabled.
     */
    onclick?: HTMLButtonAttributes["onclick"];
    /** Called with the next pressed state when activation changes it (ADR 0026). */
    onpressedchange?: (pressed: boolean) => void;
}
declare const ToggleButton: import("svelte").Component<Props, {}, "pressed">;
type ToggleButton = ReturnType<typeof ToggleButton>;
export default ToggleButton;
