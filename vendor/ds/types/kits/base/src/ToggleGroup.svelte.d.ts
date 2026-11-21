import { type ToggleGroupContract } from "./core/toggle-group";
import type { HTMLFieldsetAttributes } from "svelte/elements";
interface Props extends ToggleGroupContract, Omit<HTMLFieldsetAttributes, "children" | "class" | "name" | "disabled"> {
    /** Extra classes merged onto the native fieldset. */
    class?: string;
    /** Called with a newly selected option; reset does not emit a user change. */
    onvaluechange?: (value: string) => void;
}
declare const ToggleGroup: import("svelte").Component<Props, {}, "value">;
type ToggleGroup = ReturnType<typeof ToggleGroup>;
export default ToggleGroup;
