import type { Snippet } from "svelte";
import type { DeveloperPanelContract } from "./core/contracts/developerpanel";
interface Props extends DeveloperPanelContract {
    /** Called when the expanded state changes. */
    onopenchange?: (open: boolean) => void;
    /** Caller-owned panel content, shown when no `contextContent` is supplied. */
    children?: Snippet;
    /** Body for a host-defined context, receiving its value. */
    contextContent?: Snippet<[{
        value: string;
    }]>;
    /** Optional toolbar below the header for the current context. */
    contextToolbar?: Snippet<[{
        value: string;
    }]>;
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
