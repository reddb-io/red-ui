import type { Snippet } from "svelte";
import type { HTMLFieldsetAttributes } from "svelte/elements";
import { type FieldsetControlProps } from "./fieldset.variants";
interface Props extends Omit<HTMLFieldsetAttributes, "children" | "class"> {
    /** The accessible name rendered by the fieldset's native legend. */
    legend: string;
    /** Supporting text announced with every control that takes the group's contract. */
    help?: string;
    /** Current validation error for the group, announced and associated with its controls. */
    error?: string;
    /** The native fieldset element for rare imperative access. */
    ref?: HTMLFieldSetElement;
    /** Extra classes merged onto the group. */
    class?: string;
    /** Extra classes merged onto the legend. */
    legendClass?: string;
    /** The grouped controls; spread the received contract onto each one. */
    children?: Snippet<[FieldsetControlProps]>;
}
declare const Fieldset: import("svelte").Component<Props, {}, "ref">;
type Fieldset = ReturnType<typeof Fieldset>;
export default Fieldset;
