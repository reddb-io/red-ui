import type { DocumentMode, DocumentPresenter, DocumentValue } from "../../document";
/** Portable DocumentViewer properties shared by native adapters. */
export interface DocumentViewerContract {
    /**
         * The documents to browse: JSON-like objects, each listed by a title and subtitle taken from
         * common fields (`title`, `name`, `description`, `body` and similar), with an index fallback.
         * The search field above the list filters them.
         */
    documents: readonly DocumentValue[];
    /** Optional projection of caller-owned documents into summary, body, fields and raw views. */
    present?: DocumentPresenter;
    /** Accessible name for the complete master-detail surface. */
    label?: string;
    /** Controlled document index or extracted id; null intentionally selects nothing. */
    selected?: number | string | null;
    /** Controlled detail mode. */
    mode?: DocumentMode;
}
