import type { WorkspaceTab } from "../workspace-tabs";
/** Host-owned navigation and documents composed in an application workspace. */
export interface ApplicationWorkspaceContract {
    /** Accessible name distinguishing this workspace from other instances. */
    label: string;
    /** Render landmarks; set false inside a host that already owns those landmarks. */
    landmarks?: boolean;
    /** Accessible name for the resource navigation region. */
    navigationLabel?: string;
    /** Accessible name for the document tab list. */
    documentLabel?: string;
    /** Caller-owned documents; omit to provide a custom content region. */
    items?: readonly WorkspaceTab[];
    /** Controlled active document. */
    selected?: string | null;
    /** Request selection of a document. */
    onselectedchange?: (id: string) => void;
    /** Request closing a document; the host decides whether to discard changes. */
    oncloserequest?: (id: string) => void;
    /** Text shown when the supplied document list is empty. */
    emptyLabel?: string;
    /** Additional classes on the document panels. */
    panelClass?: string;
}
