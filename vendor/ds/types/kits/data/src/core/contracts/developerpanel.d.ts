import type { DeveloperRequest } from "../../developer-panel";
/** A host-defined developer panel context. */
export interface DeveloperPanelContext {
    /** Stable identifier for this context. */
    value: string;
    /** Visible context name. */
    label: string;
}
/** Portable developer panel properties. The application owns the source and sanitization of all data. */
export interface DeveloperPanelContract {
    /** Accessible and visible name; defaults to Developer panel. */
    label?: string;
    /** Legacy request snapshot, enabling the built-in Requests context.
     * @deprecated Use `contextContent` to compose DeveloperRequestInspector; removed next release. */
    requests?: readonly DeveloperRequest[];
    /** Host-defined contexts. */
    contexts?: readonly DeveloperPanelContext[];
    /** Context values that show the supplied toolbar; omitted means all contexts. */
    toolbarContexts?: readonly string[];
    /** Whether the bottom panel is expanded. */
    open?: boolean;
    /** Hide the panel below the desktop breakpoint. Defaults to false. */
    desktopOnly?: boolean;
    /** Whether the panel is positioned within its host instead of the viewport. */
    contained?: boolean;
}
