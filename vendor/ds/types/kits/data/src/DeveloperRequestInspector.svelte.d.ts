import type { Snippet } from "svelte";
import type { DeveloperRequest } from "./developer-panel";
interface Props {
    /** Sanitized request snapshot in chronological order, owned by the host. */
    requests: readonly DeveloperRequest[];
    /** Called when the user asks to clear the request log. */
    onrequestschange?: (requests: readonly DeveloperRequest[]) => void;
    /** Host-owned controls for the selected request. */
    requestActions?: Snippet<[DeveloperRequest]>;
    /** Optional host content in the Tools detail view. */
    children?: Snippet;
}
declare const DeveloperRequestInspector: import("svelte").Component<Props, {
    DeveloperRequest: typeof DeveloperRequest;
    RequestPhase: typeof RequestPhase;
}, "">;
type DeveloperRequestInspector = ReturnType<typeof DeveloperRequestInspector>;
export default DeveloperRequestInspector;
