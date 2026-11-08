export type { WorkspaceTab } from "../core/workspace-tabs";
import { type Snippet } from "svelte";
import type { WorkspaceTabsContract } from "../core/contracts/workspacetabs";
interface Props extends WorkspaceTabsContract {
    /** Native content per document; inactive panels remain mounted and hidden. */
    children?: Snippet<[{
        id: string;
    }]>;
    /** Additional composition classes. */
    class?: string;
}
declare const WorkspaceTabs: import("svelte").Component<Props, {}, "">;
type WorkspaceTabs = ReturnType<typeof WorkspaceTabs>;
export default WorkspaceTabs;
