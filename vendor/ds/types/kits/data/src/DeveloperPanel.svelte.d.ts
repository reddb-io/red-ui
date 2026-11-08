import type { Snippet } from "svelte";
import type { DeveloperRequest } from "./developer-panel";
import type { DeveloperPanelContract } from "./core/contracts/developerpanel";
interface Props extends DeveloperPanelContract {
    /** Called when the expanded state changes. */
    onopenchange?: (open: boolean) => void;
    /** Legacy callback for clearing the request log.
     * @deprecated Use `contextContent` to compose DeveloperRequestInspector with this handler; removed next release. */
    onrequestschange?: (requests: readonly DeveloperRequest[]) => void;
    /** Caller-owned panel content; the legacy requests prop renders it in the Tools view. */
    children?: Snippet;
    /** Body for a host-defined context, receiving its value. */
    contextContent?: Snippet<[{
        value: string;
    }]>;
    /** Optional toolbar below the header for the current context. */
    contextToolbar?: Snippet<[{
        value: string;
    }]>;
    /** Legacy actions for the selected request.
     * @deprecated Use `contextContent` to compose DeveloperRequestInspector with these actions; removed next release. */
    requestActions?: Snippet<[DeveloperRequest]>;
    /** Optional header controls before the close button. */
    headerActions?: Snippet;
    /** Extra root classes. */
    class?: string;
}
declare const DeveloperPanel: import("svelte").Component<Props, {
    DeveloperRequest: typeof DeveloperRequest;
    RequestPhase: typeof RequestPhase;
}, "open">;
type DeveloperPanel = ReturnType<typeof DeveloperPanel>;
export default DeveloperPanel;
