import type { HTMLInputAttributes } from "svelte/elements";
interface Props extends Omit<HTMLInputAttributes, "checked" | "children" | "class" | "id" | "required" | "type"> {
    /** The required visible accessible name supplied through Field. */
    label: string;
    /** Supporting text announced with the checkbox. */
    help?: string;
    /** Current validation error announced with the checkbox. */
    error?: string;
    /** Makes the requirement visible and native. */
    required?: boolean;
    /** Explicit control id; otherwise Field supplies a stable generated one. */
    id?: string;
    /** Whether it is checked. Bindable: `bind:checked` follows every toggle. */
    checked?: boolean;
    /**
     * Called with the next checked state after every toggle (ADR 0026). The
     * native `onchange` still receives the Event.
     */
    oncheckedchange?: (checked: boolean) => void;
    /** The native input element for rare imperative access. */
    ref?: HTMLInputElement;
    /** Extra classes merged onto the native checkbox. */
    class?: string;
    /** Extra classes merged onto the containing Field. */
    fieldClass?: string;
}
declare const Checkbox: import("svelte").Component<Props, {}, "ref" | "checked">;
type Checkbox = ReturnType<typeof Checkbox>;
export default Checkbox;
