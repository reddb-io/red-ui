import type { TabsContract } from "./core/contracts/tabs";
import { type Snippet } from "svelte";
interface Props extends TabsContract {
    /** Called with the newly selected value (ADR 0026's value dialect). */
    onvaluechange?: (value: string) => void;
    /** @deprecated Renamed `onvaluechange` (ADR 0026); removed next release. */
    onchange?: (value: string) => void;
    /**
     * Panel content, rendered once per item inside that tab's panel; receives `{ value }`, the
     * tab's value, to choose what to show.
     */
    children?: Snippet<[{
        value: string;
    }]>;
    /** Optional content placed before the tablist, outside its keyboard navigation. */
    leading?: Snippet;
    /** Optional actions placed beside the tablist. */
    actions?: Snippet;
    /** Extra classes, merged over the root slot's own. */
    class?: string;
}
declare const Tabs: import("svelte").Component<Props, {}, "value">;
type Tabs = ReturnType<typeof Tabs>;
export default Tabs;
