import type { Snippet } from "svelte";
import type { ApplicationWorkspaceContract } from "../core/contracts/applicationworkspace";
interface Props extends ApplicationWorkspaceContract {
    /** Caller-owned resource navigation. */
    navigation?: Snippet;
    /** Caller-owned commands or contextual controls above the documents. */
    toolbar?: Snippet;
    /** Content for each caller-owned document. */
    children?: Snippet<[{
        id: string;
    }]>;
    /** Alternative caller-owned content when no document list is supplied. */
    content?: Snippet;
    /** Additional classes on the navigation region. */
    navigationClass?: string;
    /** Additional classes on the content region. */
    contentClass?: string;
    /** Additional classes on the workspace root. */
    class?: string;
}
declare const ApplicationWorkspace: import("svelte").Component<Props, {}, "">;
type ApplicationWorkspace = ReturnType<typeof ApplicationWorkspace>;
export default ApplicationWorkspace;
