export { documentBody, documentFields, documentRaw, extractDocumentSummary, filterDocuments, formatDocumentValue, visibleDocumentIndex, presentDocument, } from "./document";
export type { DocumentPresentation, DocumentPresenter, DocumentField, DocumentItem, DocumentSummary, DocumentValue, } from "./document";
export type { DocumentMode } from "./document";
import type { DocumentViewerContract } from "./core/contracts/documentviewer";
import { type Snippet } from "svelte";
import { type DocumentMode, type DocumentValue } from "./document";
interface Props extends DocumentViewerContract {
    /** Custom recovery content when no document matches; receives a clear-and-focus action. */
    empty?: Snippet<[{
        clear: () => void;
    }]>;
    /** Item activation (ADR 0026's sanctioned `onselect`): the document chosen from the list. */
    onselect?: (document: DocumentValue, index: number) => void;
    /** @deprecated Renamed `onselect` (ADR 0026); removed next release. */
    onSelected?: (document: DocumentValue, index: number) => void;
    /** Reports the detail mode the reader switched to. */
    onmodechange?: (mode: DocumentMode) => void;
    /** @deprecated Renamed `onmodechange` (ADR 0026); removed next release. */
    onMode?: (mode: DocumentMode) => void;
    /**
     * Extra classes, merged onto the root `section` that holds both the list and the detail pane.
     */
    class?: string;
}
declare const DocumentViewer: import("svelte").Component<Props, {}, "">;
type DocumentViewer = ReturnType<typeof DocumentViewer>;
export default DocumentViewer;
