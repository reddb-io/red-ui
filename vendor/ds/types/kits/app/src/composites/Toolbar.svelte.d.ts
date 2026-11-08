import type { ToolbarContract } from "../core/contracts/toolbar";
interface Props extends ToolbarContract {
    /** Extra classes, merged over the root slot's own, onto the toolbar element. */
    class?: string;
}
declare const Toolbar: import("svelte").Component<Props, {}, "">;
type Toolbar = ReturnType<typeof Toolbar>;
export default Toolbar;
