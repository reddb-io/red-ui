import type { Snippet } from "svelte";
import { type FieldControlProps } from "./field.variants";
import { type FieldContractProps } from "./core/field";
interface Props extends FieldContractProps {
    /** Extra classes on the Field root. */
    class?: string;
    /** The canonical Input or a consumer-owned control. */
    children: Snippet<[FieldControlProps]>;
}
declare const Field: import("svelte").Component<Props, {}, "">;
type Field = ReturnType<typeof Field>;
export default Field;
