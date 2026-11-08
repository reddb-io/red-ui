import type { HTMLTextareaAttributes } from "svelte/elements";
interface Props extends Omit<HTMLTextareaAttributes, "class" | "value"> {
    /** The current value. Bindable: `bind:value` follows every keystroke. */
    value?: HTMLTextareaAttributes["value"];
    /** Called with the new value on every input (ADR 0026's value dialect); the native `oninput` still receives the Event. */
    onvaluechange?: (value: string) => void;
    /** The native textarea, available for imperative focus or selection. */
    ref?: HTMLTextAreaElement;
    /** Extra classes, merged over the canonical appearance. */
    class?: string;
}
declare const Textarea: import("svelte").Component<Props, {}, "value" | "ref">;
type Textarea = ReturnType<typeof Textarea>;
export default Textarea;
