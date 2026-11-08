export type { SelectOption } from "./core/choices";
import { type SelectOption } from "./core/choices";
import type { Snippet } from "svelte";
import type { HTMLSelectAttributes } from "svelte/elements";
import { type SelectSize } from "./select.variants";
interface Props extends Omit<HTMLSelectAttributes, "children" | "class" | "value"> {
    /** The native option and optgroup content. */
    children?: Snippet;
    /** Flat caller-owned choices for compositions that do not need custom option markup. */
    options?: readonly SelectOption[];
    /** The native select, available for imperative focus. */
    ref?: HTMLSelectElement;
    /** Current native value, bindable for canonical compositions. */
    value?: HTMLSelectAttributes["value"];
    /** Initial uncontrolled native value, including arrays for multiple selection. */
    defaultValue?: HTMLSelectAttributes["value"];
    /** Called with the newly selected value (ADR 0026's value dialect); the native `onchange` still receives the Event. */
    onvaluechange?: (value: string) => void;
    /**
     * The control height step, matching Button's `size` (default `md`). Named
     * apart from the native `size` attribute, which is still spread through.
     */
    controlSize?: SelectSize;
    /** Extra classes, merged over the canonical appearance. */
    class?: string;
}
declare const Select: import("svelte").Component<Props, {}, "value" | "ref">;
type Select = ReturnType<typeof Select>;
export default Select;
