import type { HTMLInputAttributes } from "svelte/elements";
import { type InputSize } from "./input.variants";
interface Props extends Omit<HTMLInputAttributes, "class" | "value"> {
    /** The current value. Bindable: `bind:value` follows every keystroke. */
    value?: HTMLInputAttributes["value"];
    /** Called with the new value on every input (ADR 0026's value dialect); the native `oninput` still receives the Event. */
    onvaluechange?: (value: HTMLInputAttributes["value"]) => void;
    /** The native input element, available for imperative focus or selection. */
    ref?: HTMLInputElement;
    /**
     * The control height step, matching Button's `size` (default `md`). Named
     * apart from the native `size` attribute, which is still spread through.
     */
    controlSize?: InputSize;
    /** Extra classes, merged over the canonical appearance. */
    class?: string;
}
declare const Input: import("svelte").Component<Props, {}, "value" | "ref">;
type Input = ReturnType<typeof Input>;
export default Input;
